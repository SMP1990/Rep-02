"""Build the browser model: ISNet with int8 weights, split into small parts.

ISNet / DIS by xuebinqin, Apache-2.0 (https://github.com/xuebinqin/DIS).
The ONNX export comes from the rembg project's GitHub release.

- Conv weights are stored as int8 (one scale per output channel) and turned
  back into float when the model loads; all maths stays float32. This halves
  the download (178MB -> 47MB) and the result matches the original (0.08%).
  Full int8 (weights + maths) was tested and rejected: it leaves noise.
- MaxPool ceil_mode is switched off: at 1024 (and 512) every pooled size is
  even, so the result is identical, and more runtimes accept it.
- Any input size: the export wrote each upsample target (32x32 ... 1024x1024)
  as a fixed number. Each one now reads the size of the tensor it is joined
  with, so phones can run the model at 512 (4x less work and memory) while
  the 1024 result stays identical.
- Only the final mask is kept as output; the side outputs used in training
  cost time and memory in the browser.
- The file is cut into parts under 20MB so the jsDelivr CDN can serve them
  from GitHub; the browser joins them again (see src/lib/model.ts).

Usage:  pip install onnx numpy
        python3 scripts/prepare_model.py
"""
import os
import urllib.request

import numpy as np
import onnx
from onnx import helper, numpy_helper

URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx"
PART_SIZE = 15 * 1024 * 1024
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "model")
SRC = os.path.join(HERE, "isnet-general-use.fp32.onnx")

if not os.path.exists(SRC):
    print("Downloading", URL)
    urllib.request.urlretrieve(URL, SRC)
model = onnx.load(SRC)
graph = model.graph

for node in graph.node:
    if node.op_type == "MaxPool":
        for attr in node.attribute:
            if attr.name == "ceil_mode":
                attr.i = 0



def any_input_size(graph):
    """Resize sizes = Concat(Shape(x)[0:2], const HxW): swap the constant
    for the HxW of the tensor the result is concatenated with (or, for the
    side outputs, of the input image)."""
    consumers = {}
    for n in graph.node:
        for i in n.input:
            consumers.setdefault(i, []).append(n)
    producer = {o: n for n in graph.node for o in n.output}
    extra = []
    for n in [n for n in graph.node if n.op_type == "Resize"]:
        sizes = producer[n.input[3]]
        assert sizes.op_type == "Concat" and producer[sizes.input[1]].op_type == "Constant"
        user = consumers[n.output[0]][0]
        if user.op_type == "Concat":
            target = [i for i in user.input if i != n.output[0]][0]
        else:
            target = graph.input[0].name
        k = n.name.strip("/").replace("/", "_")
        extra += [
            helper.make_node("Shape", [target], [k + "_hw_shape"]),
            helper.make_node("Slice", [k + "_hw_shape", "hw_from", "hw_to"], [k + "_hw"]),
        ]
        sizes.input[1] = k + "_hw"
    graph.initializer.extend([
        numpy_helper.from_array(np.array([2], np.int64), "hw_from"),
        numpy_helper.from_array(np.array([4], np.int64), "hw_to"),
    ])
    graph.node.extend(extra)
    for dim in graph.input[0].type.tensor_type.shape.dim[2:]:
        dim.dim_param = "size"
    del graph.value_info[:]


def only_main_output(graph):
    keep = graph.output[0]
    del graph.output[:]
    graph.output.append(keep)
    keep = graph.output[0]  # append() stored a copy
    for dim in keep.type.tensor_type.shape.dim[2:]:
        dim.dim_param = "size"
    needed = {keep.name}
    live = []
    for n in reversed(list(graph.node)):
        if any(o in needed for o in n.output):
            live.append(n)
            needed.update(i for i in n.input if i)
    del graph.node[:]
    graph.node.extend(reversed(live))
    used = [t for t in graph.initializer if t.name in needed]
    del graph.initializer[:]
    graph.initializer.extend(used)


def sort_nodes(graph):
    """Topological order (the added Shape nodes must come before use)."""
    ready = {i.name for i in graph.input} | {t.name for t in graph.initializer} | {""}
    todo, done = list(graph.node), []
    while todo:
        rest = []
        for n in todo:
            if all(i in ready for i in n.input):
                done.append(n)
                ready.update(n.output)
            else:
                rest.append(n)
        assert len(rest) < len(todo), "cycle"
        todo = rest
    del graph.node[:]
    graph.node.extend(done)


any_input_size(graph)
sort_nodes(graph)
only_main_output(graph)

inits = {t.name: t for t in graph.initializer}
dequant = []
for node in graph.node:
    if node.op_type != "Conv" or node.input[1] not in inits:
        continue
    name = node.input[1]
    w = numpy_helper.to_array(inits[name]).astype(np.float32)
    if w.size < 4096:
        continue  # tiny weights: not worth it
    scale = np.maximum(np.abs(w).max(axis=(1, 2, 3)), 1e-12) / 127.0
    q = np.clip(np.round(w / scale[:, None, None, None]), -127, 127).astype(np.int8)
    graph.initializer.remove(inits[name])
    graph.initializer.extend([
        numpy_helper.from_array(q, name + "_q"),
        numpy_helper.from_array(scale.astype(np.float32), name + "_s"),
        numpy_helper.from_array(np.zeros_like(scale, dtype=np.int8), name + "_z"),
    ])
    dequant.append(helper.make_node(
        "DequantizeLinear", [name + "_q", name + "_s", name + "_z"], [name], axis=0))

nodes = list(graph.node)
del graph.node[:]
graph.node.extend(dequant + nodes)
onnx.checker.check_model(model)

data = model.SerializeToString()
os.makedirs(OUT_DIR, exist_ok=True)
for old in os.listdir(OUT_DIR):
    os.remove(os.path.join(OUT_DIR, old))
parts = [data[i:i + PART_SIZE] for i in range(0, len(data), PART_SIZE)]
for n, part in enumerate(parts):
    with open(os.path.join(OUT_DIR, f"isnet.part{n}"), "wb") as f:
        f.write(part)
print(f"{len(dequant)} weights quantized, {len(data) / 1e6:.1f}MB in {len(parts)} parts")
print("Update MODEL_PARTS / MODEL_BYTES in src/lib/model.ts:", len(parts), len(data))
