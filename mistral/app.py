import gradio as gr
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

MODEL_ID = "microsoft/phi-2"
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForCausalLM.from_pretrained(MODEL_ID, torch_dtype=torch.float32, device_map="auto")

def ndf_assist(node_name, paragraph):
    prompt = f"Summarize the concept: {node_name}"
    input_ids = tokenizer(prompt, return_tensors="pt").input_ids.to(model.device)
    with torch.no_grad():
        output = model.generate(input_ids, max_new_tokens=96)
    return tokenizer.decode(output[0], skip_special_tokens=True)

iface = gr.Interface(
    fn=ndf_assist,
    inputs=[
        gr.Textbox(label="Node Name", value=""),
        gr.Textbox(label="Paragraph", lines=4, value=""),
    ],
    outputs="text",
    title="Node Summarizer",
    description="Enter a node name to get a summary using phi-2."
)

iface.launch(share=True)
