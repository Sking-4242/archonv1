FROM node:20-slim

WORKDIR /app

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY package.json ./
RUN npm install

COPY . .

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3002

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3002"]
