from fastapi import FastAPI, Request
from llama_cpp import Llama

app = FastAPI()
MODEL_PATH = "mistral/mistral-7b-instruct-v0.2.Q6_K.gguf"

llm = Llama(
    model_path=MODEL_PATH,
    n_ctx=2048,
    n_threads=4,  # Adjust for your CPU
    n_gpu_layers=0  # Set >0 if you have GPU support
)

@app.post("/summarize")
async def summarize(request: Request):
    data = await request.json()
    prompt = data.get("text", "")
    output = llm(prompt, max_tokens=256, stop=["</s>"])
    summary = output["choices"][0]["text"]
    return {"summary": summary}