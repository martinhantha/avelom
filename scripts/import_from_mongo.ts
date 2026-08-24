import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

/*
 * Requires the MongoDB Node.js Driver
 * https://mongodb.github.io/node-mongodb-native
 */

const filter = {};
const defaultMongoUri =
  'mongodb://cluster0-shard-00-02.e0ea1.mongodb.net,cluster0-shard-00-01.e0ea1.mongodb.net,cluster0-shard-00-00.e0ea1.mongodb.net/?tls=true&authMechanism=MONGODB-X509&authSource=%24external&serverMonitoringMode=poll&maxIdleTimeMS=30000&minPoolSize=0&maxPoolSize=5&maxConnecting=6&replicaSet=atlas-9l7gkv-shard-0&appName=Data+Explorer--6159de92d355ff085acdfcea';
const outputPath = process.env.MONGO_EXPORT_PATH ?? './tmp/flights.json';
const mongoUri = process.env.MONGODB_URI ?? process.env.MONGO_URI ?? defaultMongoUri;
const dbName = process.env.MONGODB_DB ?? process.env.MONGO_DB ?? 'myflights';

async function main() {
  const useX509 = /authMechanism=MONGODB-X509/i.test(mongoUri);
  const tlsCertificateKeyFile = process.env.MONGO_TLS_CERT_KEY_FILE;

  if (useX509 && !tlsCertificateKeyFile) {
    throw new Error(
      'Missing MONGO_TLS_CERT_KEY_FILE. Point it to your Atlas X.509 client PEM file.'
    );
  }

  const client = await MongoClient.connect(mongoUri, useX509
    ? {
        tls: true,
        tlsCertificateKeyFile,
        tlsCertificateKeyFilePassword:
          process.env.MONGO_TLS_CERT_KEY_FILE_PASSWORD,
      }
    : undefined);

  const coll = client.db(dbName).collection('flights');
  const cursor = coll.find(filter).sort({ date: -1 });
  const result = await cursor.toArray();
  // save to tmp/flights.json
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});