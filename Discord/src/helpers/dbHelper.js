import { createConnection } from 'mysql2';

class DBHelper {
    static async query(connection, sql, values) {
        return new Promise((resolve, reject) => {
            connection.query(sql, values, (error, results) => {
                error ? reject(error) : resolve(results);
            });
        });
    }

    static async connect(serverConfig) {
        const connection = createConnection(serverConfig);
        await new Promise((resolve, reject) => {
            connection.connect(err => err ? reject(err) : resolve());
        });
        return connection;
    }

    static async disconnect(connection) {
        await new Promise((resolve) => {
            connection.end(() => {
                resolve();
            });
        });
    }

    static async processServer(serverConfig, callback) {
        const connection = await this.connect(serverConfig);
        try {
            const result = await callback(connection);
            return result;
        } catch (error) {
            console.error('Database error:', error);
            return [];
        } finally {
            await this.disconnect(connection);
        }
    }

    static getCfg() {
        if (process.env.DBS_NAME) {
            const dbsConfig = [];
            const dbNames = [];

            const sHosts = process.env.DBS_HOST.split(',');
            const sNames = process.env.DBS_NAME.split(',');
            const sUsers = process.env.DBS_USER.split(',');
            const sPasses = process.env.DBS_PASS.split(',');
            const sPorts = process.env.DBS_PORT.split(',');

            for (let i = 0; i < sPorts.length; i++) {
                dbsConfig.push({
                    host: sHosts[i],
                    user: sUsers[i],
                    password: sPasses[i],
                    database: sNames[i],
                    port: sPorts[i],
                });
                dbNames.push(sNames[i]);
            }

            return { cfg: dbsConfig, names: dbNames };
        }
        else {
            throw new Error("Unable to load check, fill config correctly");
        }
    }
}

export default DBHelper;