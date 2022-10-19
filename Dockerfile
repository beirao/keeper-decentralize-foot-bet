FROM python:3.8-slim

WORKDIR /main

COPY . /main/

RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r /main/requirements.txt

CMD ["python", "cron.py"]
