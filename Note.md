# how work with docker:
 -- docker compose up -d --build (create container and start it with compose.yaml file you add in project)
 -- docker compose down (remove container which builded)
 -- docker compose stop and start (start and stop container)
 -- docker compose logs -f <service-name which is in compose.yaml> (show logs of container which is running)

databse-url : @127.0.0.1:5432 => port with id of wsl. 
databse-url : @db:5432 => port with sign of database in docker (when you run database with docker). 


# how work with Prima

# نصب Prisma Client و CLI نسخه 7
npm install @prisma/client@7
npm install --save-dev prisma@7

# نصب درایور مخصوص PostgreSQL برای Prisma 7
npm install @prisma/adapter-pg pg
npm install --save-dev @types/pg

# ساخت فایل های اولیه
npx prisma init

