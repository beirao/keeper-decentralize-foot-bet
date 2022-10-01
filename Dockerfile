FROM python:3.8-slim

WORKDIR /code

COPY . /code/

RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r /code/requirements.txt

CMD ["python", "cron.py"]
