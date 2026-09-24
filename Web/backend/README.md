# LogiAI Windows GPU Server

The project runs three local services for OCR, SLM extraction, and the K-Fold evaluation UI:

- Frontend: `5173`
- OCR gateway: `8000`
- Dedicated Qwen SLM: `8001`

## Clone and install

Run these commands in PowerShell on the rented Windows GPU server. Replace the repository URL with the authorized project remote.

```powershell
git clone --branch admin-dev-integration --single-branch <REPOSITORY_URL> C:\LogiToSche
cd C:\LogiToSche\Web
npm install

cd C:\LogiToSche\Web\backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

The machine must have an NVIDIA driver, Git, Node.js, and Python installed before these commands run. Do not copy a `.venv` or `node_modules` from another machine.

## Prompt library

Static prompts are grouped by execution mode under `Web/backend/prompt_library`:

- `benchmark/zero-shot/kfold_extraction.txt` — K-Fold without examples
- `benchmark/one-shot/kfold_extraction.txt` — K-Fold with one training example
- `benchmark/few-shot/kfold_extraction.txt` — K-Fold with up to three training examples
- `admin/presets.json` — Admin prompt presets

One-shot and few-shot examples are generated from each fold's training split at runtime. They are not stored in the prompt files, so validation documents are not leaked into the examples.

## Dataset and environment

The repository includes 300 benchmark images in `C:\LogiToSche\To_Testing` and the ground-truth manifest at `C:\LogiToSche\Web\backend\ground_truth_dataset.json` after cloning.

Create `C:\LogiToSche\Web\backend\.env` from `.env.example` and set a long random value for `LOGIAI_GATEWAY_TOKEN`. Create `C:\LogiToSche\Web\.env` with the same value as `VITE_API_TOKEN`. The example paths assume the clone location above; update them if the project is stored elsewhere.

Runtime output is written to these directories and should not be committed:

- `Web/backend/reports`
- `Web/backend/ocr_cache`
- `Web/backend/prediction_cache`

## GPU checks

Run these checks before starting the services:

```powershell
nvidia-smi
cd C:\LogiToSche\Web\backend
.\.venv\Scripts\python.exe -c "import torch; print('torch CUDA:', torch.cuda.is_available()); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'no CUDA device')"
.\.venv\Scripts\python.exe -c "import paddle; print('Paddle CUDA:', paddle.device.is_compiled_with_cuda())"
```

Both CUDA checks must report an available GPU. Model downloads occur when the services first load OCR and SLM models, so the server needs internet access and sufficient disk space.

## Start and stop

From `C:\LogiToSche\Web`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-all.ps1
```

The script starts all services in the background, writes logs beside the project, and waits for the health endpoints. To stop the services:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-all.ps1
```

Check these endpoints locally on the server:

- `http://127.0.0.1:8000/api/health`
- `http://127.0.0.1:8001/api/slm/health`
- `http://127.0.0.1:8000/api/system/health`
- `http://127.0.0.1:5173`

## K-Fold smoke test sequence

Do not start all 300 documents before verifying the services. Use the UI's evaluation controls in this order:

1. Confirm OCR and SLM health are ready.
2. Run one single-document evaluation.
3. Run a single fold with `max_docs` limited to 2 or 3 documents.
4. Run one complete fold and inspect the report and logs.
5. Run the full 5-Fold evaluation with `k_splits=5` and `random_seed=42`.

The background job state and reports survive a normal process stop in the configured report directory. Keep the server awake during inference and retain the generated reports, prediction cache, OCR cache, and service logs as test artifacts.

## Security

Keep ports `8000` and `8001` private. Prefer an SSH tunnel or VPN instead of exposing the services directly to the internet. If remote browser access is required, expose only the frontend through a protected route and keep the gateway token enabled.

The frontend script resolves its project directory from the script location, so it is portable across drive letters and clone paths.

## Local development

For a local OCR-only run, use the same virtual environment and start the gateway directly:

```powershell
cd C:\LogiToSche\Web\backend
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

The frontend uses the Vite proxy to forward `/api` requests to the gateway on port `8000`.
