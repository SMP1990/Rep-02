"""Build the "better results" model: U2Net, made small, split into parts.

U2Net by xuebinqin, Apache-2.0 (https://github.com/xuebinqin/U-2-Net).
The ONNX export comes from the rembg project's GitHub release.

Used only when the user asks for better results. Its mask is combined with
the ISNet mask in the browser (see src/lib/combine.ts): U2Net sees whole
objects that ISNet sometimes cuts away (a robe in front of a dark door),
ISNet gives the sharp edges. Tested against BiRefNet as a reference on 20
photos: ISNet alone 2.18% off, combined 1.69% (the user's problem photo:
8.3% -> 1.4%). BiRefNet itself needs ~7GB of memory, too much for browsers.

- Upgraded to opset 13 so weights can be stored per channel.
- Conv weights stored as int8 (one scale per output channel), turned back
  into float when the model loads; maths stays float32. 176MB -> 44MB.

Usage:  pip install onnx numpy
        python3 scripts/prepare_hd_model.py
"""
import os
import urllib.request

import numpy as np
import onnx
from onnx import helper, numpy_helper, version_converter

URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx"
PART_SIZE = 15 * 1024 * 1024
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "model-hd")
SRC = os.path.join(HERE, "u2net.fp32.onnx")

if not os.path.exists(SRC):
    print("Downloading", URL)
    urllib.request.urlretrieve(URL, SRC)
model = version_converter.convert_version(onnx.load(SRC), 13)
graph = model.graph

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
for k, part in enumerate(parts):
    with open(os.path.join(OUT_DIR, f"u2net.part{k}"), "wb") as f:
        f.write(part)
os.remove(SRC)
print(f"{len(dequant)} weights quantized, {len(data) / 1e6:.1f}MB in {len(parts)} parts")
print("Update the hd entry in src/lib/models.ts:", len(parts), len(data))
