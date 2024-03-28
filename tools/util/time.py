import time


class ExecutionTimer:
    def __init__(self):
        self.start_time = None
        self.start()

    def start(self):
        if self.start_time is not None:
            print("Timer is already running. Use .stop() to stop it")
            return

        self.start_time = time.time()

    def stop(self):
        if self.start_time is None:
            print("Timer is not running. Use .start() to start it")
            return

        elapsed_time = time.time() - self.start_time
        self.start_time = None
        formatted_time = "{:.2f}".format(elapsed_time)
        print(f"Elapsed time: {formatted_time} seconds")
