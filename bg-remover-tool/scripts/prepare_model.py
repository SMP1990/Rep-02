"""Build the browser model: ISNet with int8 weights, split into small parts.

ISNet / DIS by xuebinqin, Apache-2.0 (https://github.com/xuebinqin/DIS).
The ONNX export comes from the rembg project's GitHub release.

- Conv weights are stored as int8 (one scale per output channel) and turned
  back into float when the model loads; all maths stays float32. This halves
  the download (178MB -> 47MB) and the result matches the original (0.08%).
  Full int8 (weights + maths) was tested and rejected: it leaves noise.
- MaxPool ceil_mode is switched off: with the fixed 1024 input every pooled
  size is even, so the result is identical, and more runtimes accept it.
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
