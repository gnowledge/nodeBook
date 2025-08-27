FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK data during build (when we're still root)
RUN python3 -c "import nltk; import os; nltk_data_dir = '/app/nltk_data'; os.makedirs(nltk_data_dir, exist_ok=True); nltk.download('wordnet', download_dir=nltk_data_dir); nltk.download('punkt', download_dir=nltk_data_dir); nltk.download('averaged_perceptron_tagger', download_dir=nltk_data_dir); print('NLTK data download complete!')"
RUN cd /app/nltk_data/corpora && unzip -o wordnet.zip && rm wordnet.zip

# Copy application code
COPY . .

# Create non-root user
RUN groupadd -g 1001 pythonuser && \
    useradd -r -u 1001 -g pythonuser -s /bin/bash pythonuser && \
    chown -R pythonuser:pythonuser /app

# Switch to non-root user
USER pythonuser

# Expose the port the app runs on
EXPOSE 3003

# Start the service
CMD ["python", "main.py"]
