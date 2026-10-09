"""Build the HD model: BiRefNet-lite (general), made small, split into parts.

BiRefNet by ZhengPeng7, MIT licence (https://github.com/ZhengPeng7/BiRefNet).
The ONNX export comes from the rembg project's GitHub release.

Used only when the user asks for better results: it understands hard scenes
far better than ISNet (people next to similar colours, several people), but
is about 10x more work, so it is downloaded on request.

- Conv and MatMul weights are stored as int8 (one scale per output channel)
  and turned back into float when the model loads; maths stays float32.
- Large float constants that only hold whole numbers (deformable-conv
  sampling grids) are stored as uint8/int16 and cast back to float.
Together: 224MB -> 68MB, result within 0.05% of the original.

Usage:  pip install onnx numpy
        python3 scripts/prepare_hd_model.py
"""
import os
import urllib.request

import numpy as np
import onnx
from onnx import helper, numpy_helper

URL = ("https://github.com/danielgatis/rembg/releases/download/v0.0.0/"
       "BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx")
PART_SIZE = 15 * 1024 * 1024
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "model-hd")
SRC = os.path.join(HERE, "birefnet-lite.fp32.onnx")

if not os.path.exists(SRC):
    print("Downloading", URL)
    urllib.request.urlretrieve(URL, SRC)
model = onnx.load(SRC)
g = model.graph
inits = {t.name: t for t in g.initializer}

# MatMul weights reach their MatMul through Identity nodes: point the users
# at the initializer itself so the weight can be quantized.
ident = {n.output[0]: n.input[0] for n in g.node if n.op_type == "Identity" and n.input[0] in inits}
assert not ({o.name for o in g.output} & set(ident))
for n in g.node:
    for k, name in enumerate(n.input):
        if name in ident:
            n.input[k] = ident[name]
kept = [n for n in g.node if not (n.op_type == "Identity" and n.output[0] in ident)]
del g.node[:]
g.node.extend(kept)

users = {}
for n in g.node:
    for name in n.input:
        users.setdefault(name, []).append(n.op_type)

dequant, done = [], set()
for n in g.node:
    axis = {"Conv": 0, "MatMul": 1}.get(n.op_type)
    if axis is None or len(n.input) < 2:
        continue
    name = n.input[1]
    if name not in inits or name in done or set(users[name]) - {"Conv", "MatMul"}:
        continue
    w = numpy_helper.to_array(inits[name]).astype(np.float32)
    if w.size < 4096 or w.ndim < 2:
        continue
    red = tuple(i for i in range(w.ndim) if i != axis)
    scale = np.maximum(np.abs(w).max(axis=red), 1e-12) / 127.0
    shape = [1] * w.ndim
    shape[axis] = -1
    q = np.clip(np.round(w / scale.reshape(shape)), -127, 127).astype(np.int8)
    g.initializer.remove(inits[name])
    g.initializer.extend([
        numpy_helper.from_array(q, name + "_q"),
        numpy_helper.from_array(scale.astype(np.float32), name + "_s"),
        numpy_helper.from_array(np.zeros_like(scale, dtype=np.int8), name + "_z"),
    ])
    dequant.append(helper.make_node(
        "DequantizeLinear", [name + "_q", name + "_s", name + "_z"], [name], axis=axis))
    done.add(name)

nodes = []
for n in g.node:
    nodes.append(n)
    if n.op_type != "Constant":
        continue
    attr = n.attribute[0]
    if attr.name != "value" or attr.t.data_type != 1 or len(attr.t.raw_data) <= 100_000:
        continue
    v = numpy_helper.to_array(attr.t)
    if not np.all(v == np.round(v)):
        continue
    small = v.astype(np.uint8) if v.min() >= 0 and v.max() <= 255 else v.astype(np.int16)
    assert np.all(small.astype(np.float32) == v)
    out = n.output[0]
    n.output[0] = out + "_small"
    attr.t.CopyFrom(numpy_helper.from_array(small, out + "_small"))
    nodes.append(helper.make_node("Cast", [out + "_small"], [out], to=1))

del g.node[:]
g.node.extend(dequant + nodes)
onnx.checker.check_model(model)

data = model.SerializeToString()
os.makedirs(OUT_DIR, exist_ok=True)
for old in os.listdir(OUT_DIR):
    os.remove(os.path.join(OUT_DIR, old))
parts = [data[i:i + PART_SIZE] for i in range(0, len(data), PART_SIZE)]
for k, part in enumerate(parts):
    with open(os.path.join(OUT_DIR, f"birefnet.part{k}"), "wb") as f:
        f.write(part)
os.remove(SRC)
print(f"{len(done)} weights quantized, {len(data) / 1e6:.1f}MB in {len(parts)} parts")
print("Update the hd entry in src/lib/models.ts:", len(parts), len(data))
