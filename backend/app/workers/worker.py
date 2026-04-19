# app/workers/worker.py

from rq import Worker, Queue, Connection
from redis import Redis

redis_conn = Redis()

with Connection(redis_conn):
    worker = Worker([Queue()])
    worker.work()