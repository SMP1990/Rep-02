"""Download ISNet (general use) and convert it to fp16 for the browser.

ISNet / DIS by xuebinqin, Apache-2.0 (https://github.com/xuebinqin/DIS).
The ONNX export comes from the rembg project's GitHub release.

fp16 halves the download (178MB -> ~90MB) with no visible quality change.
int8 was tested and rejected: it leaves noise in the background.

Usage:  pip install onnx onnxruntime sympy
        python3 scripts/prepare_model.py
"""
import os
import urllib.request

import onnx
from onnxruntime.transformers.onnx_model import OnnxModel

URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "public", "models")
SRC = os.path.join(OUT_DIR, "isnet-general-use.fp32.onnx")
DST = os.path.join(OUT_DIR, "isnet-general-use.fp16.onnx")

os.makedirs(OUT_DIR, exist_ok=True)
if not os.path.exists(SRC):
    print("Downloading", URL)
    urllib.request.urlretrieve(URL, SRC)

graph = onnx.shape_inference.infer_shapes(onnx.load(SRC))
dims = {
    v.name: [d.dim_value for d in v.type.tensor_type.shape.dim]
    for v in list(graph.graph.value_info) + list(graph.graph.input)
}
# WebGPU cannot run MaxPool with ceil_mode=1. With the fixed 1024 input every
# pooled size is even, so ceil_mode=0 gives exactly the same result.
for node in graph.graph.node:
    if node.op_type != "MaxPool":
        continue
    h, w = dims[node.input[0]][2:]
    assert h % 2 == 0 and w % 2 == 0, f"{node.name}: odd size {h}x{w}"
    for attr in node.attribute:
        if attr.name == "ceil_mode":
            attr.i = 0

model = OnnxModel(graph)
# Resize must stay fp32, otherwise the converted graph fails to load.
model.convert_float_to_float16(keep_io_types=True, op_block_list=["Resize"])
model.save_model_to_file(DST)
os.remove(SRC)
print("Saved", DST, round(os.path.getsize(DST) / 1e6, 1), "MB")
