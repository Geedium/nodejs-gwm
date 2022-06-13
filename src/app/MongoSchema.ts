import { Db, MongoClient } from 'mongodb';
import type { AnyError, Document, Callback } from "mongodb";

interface Query {
    collection: string;
    aggregate: any[];
}

export default class MongoSchema {
    private _client: MongoClient;
    private _db: Db;

    private _options: Query = {
        collection: '',
        aggregate: []
    };

    constructor(url: string) {
        this._client = new MongoClient(url);
    }

    connect() {
        return new Promise<MongoSchema | AnyError>((resolve, reject) => {
            this._client.connect((err) => {
                if (err) {
                    reject(err);
                    return;
                }
                console.log('i Connection established');
                resolve(this);
            })
        })
    }

    select(name: string) {
        this._db = this._client.db(name);
        return this;
    }

    formQuery(collection?: string) {
        this._options.collection = collection || '';
        this._options.aggregate = [];
        return this;
    }

    lookup(from: string, as: string, localField: string, foreignField: string, fields: any) {
        this._options.aggregate.push({
            $lookup: {
                from,
                let: { field: `$${localField}` },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: [`$_${foreignField}`, "$$field"] },
                        },
                    },
                    { $project: fields },
                ],
                as,
            },
        });
        return this;
    }

    unwind(field: string) {
        this._options.aggregate.push({
            $unwind: `$${field}`
        })
    }

    aggregate(callback: Callback<Document[]>) {
        if (!callback) {
            return;
        }
        this._db.collection(this._options.collection).aggregate(this._options.aggregate).toArray(callback);
    }
}
