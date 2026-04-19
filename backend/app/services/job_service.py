
from rq import Queue
from redis import Redis
from app.workers.tasks import heavy_analysis

redis_conn = Redis(host="localhost", port=6379)
q = Queue(connection=redis_conn)

def enqueue_analysis(data):
    job = q.enqueue(heavy_analysis, data)
    return job.get_id()