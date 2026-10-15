**Football Query Engine**

Ever wondered which Premier League footballer under 173cm with a minimum of 50 appearances has the best ratio of goals and assists in the second half of games?

<img width="1908" height="953" alt="image" src="https://github.com/user-attachments/assets/8e393308-cc0f-4928-a61f-8b95f3663278" />

Or which 35+year old has inflicted the most misery on Premier League teams in a Champions League game?

<img width="1919" height="949" alt="image" src="https://github.com/user-attachments/assets/4c999fda-6309-446a-83c1-7d8b59fd631c" />

Or just how prolific a sub Ole was?

<img width="1913" height="942" alt="image" src="https://github.com/user-attachments/assets/67bb1ec8-9562-4c4f-840c-114336bc096c" />

Finding the answer is now easy! This project aims to get the most out of basic stats (goals, own goals, assists, height, age, event times, yellows, reds) as is possible. No fancy xG, xA or distance covered etc., but certainly enough to generate some fiendish pub quiz questions. 

**Setup Instructions**

The app is live here: https://football-query-engine.vercel.app

However, if you want to self-manage, instructions can be found below.

- Create a Postgres database and apply the DB Schema provided
- Download the data linked below and populate the DB tables with this data (the Postgres table names correspond to the Excel file names). These files cover data from 2012 onwards.
- Pass the DB URL as an environment variable to the Rust app

Now you should be good to go! To extend the years/competitions covered, please see this repo: https://github.com/dcaribou/transfermarkt-scraper

**How it works**

This project has a simple architecture. For the main query screen, the filter bar adds params to the URL (meaning each query can be saved and shared) which are passed to the Rust backend. These params are then translated into fairly complex SQL queries (stuff you'd not want to write by hand!). The power of the tool is that there are endless queries to be run. For the individual player screen, all filters/chart operations are handled by the frontend.

Data can be downloaded here: https://www.kaggle.com/datasets/davidcariboo/player-scores/data

Big thanks to https://github.com/dcaribou/transfermarkt-datasets

