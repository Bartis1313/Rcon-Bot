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
}

export default DBHelper;