import { createPool, Pool, PoolOptions } from 'mysql2/promise';
import { DatabasePort } from '../../../core/application/ports/out/DatabasePort';

export class MysqlDatabaseAdapter implements DatabasePort {
    private pool: Pool;

    constructor() {
        const dbHost: string = process.env.DB_HOST || '';
        const dbPort: number = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
        const dbUser: string = process.env.DB_USER || '';
        const dbPassword: string = process.env.DB_PASSWORD || '';
        const dbName: string = process.env.DB_NAME || '';

        const poolConfig: PoolOptions = {
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
        };

        this.pool = createPool(poolConfig);
    }

    async executeReadQuery(sqlQuery: string): Promise<any[]> {
        if (!sqlQuery.trim().toUpperCase().startsWith('SELECT')) {
            throw new Error('Security Violation: Only SELECT queries are allowed.')
        }

        try {
            const [rows] = await this.pool.query(sqlQuery);
            return rows as any[];
        } catch (error) {
            console.log('[MysqlAdapter] Query execution failed:', error)
            throw new Error('Failed to execute database query.')
        }
    }

    async getSchemaDefinition(): Promise<string> {
        return `
            Database schema (MySQL) for a Financial Portfolio Copilot:
            
            - customers (id, company, last_name, first_name, email_address, job_title, business_phone, home_phone, mobile_phone, fax_number, address, city, state_province, zip_postal_code, country_region, web_page, notes, attachments)
            
            - employees (id, company, last_name, first_name, email_address, job_title, business_phone, home_phone, mobile_phone, fax_number, address, city, state_province, zip_postal_code, country_region, web_page, notes, attachments)
            
            - orders (id, employee_id, customer_id, order_date, shipped_date, shipper_id, ship_name, ship_address, ship_city, ship_state_province, ship_zip_postal_code, ship_country_region, shipping_fee, taxes, payment_type, paid_date, notes, tax_rate, tax_status_id, status_id)
            
            - products (id, supplier_ids, product_code, product_name, description, standard_cost, list_price, reorder_level, target_level, quantity_per_unit, discontinued, minimum_reorder_quantity, category, attachments)
            
            Relationships:
            - orders.customer_id references customers.id
            - orders.employee_id references employees.id
        `;
    }
}