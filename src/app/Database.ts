type Driver = 'mongodb';

export default class Database {
    constructor(driver: Driver = 'mongodb', options = {}) {
        (async () => {
            const mongodb = await import('mongodb');
            if (!mongodb) {
                console.error('MongoDB driver not available.');
            } else {

            }
        })();
    }
}
