import schedule
import os
import time
import yaml
import logging

def job() :
    os.system("python main.py")
    

if __name__ == "__main__":

    with open("ext/config-keeper.yaml", "r") as stream:
        try:
            config = yaml.safe_load(stream)
        except yaml.YAMLError as exc:
            print(exc)

    logging.basicConfig(filename=config["logPath"], level=logging.INFO,
            format="%(asctime)s %(levelname)s %(message)s")

    # schedule.every(2).seconds.do(job)
    schedule.every(config["cronCallInterval"]).seconds.do(job)

    job() # exec job once at the beginning
    while 1:
        try :
            schedule.run_pending()
        except Exception as e :
            print("Error cron :",e)
        finally :
            # time.sleep(60)
            time.sleep(2)
