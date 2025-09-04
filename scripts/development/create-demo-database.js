const path = require('path');

// Use local dependencies
const ExcelJS = require('exceljs');

// Import Supabase from local config
const { supabaseAdmin } = require('./src/config/supabase');

class DemoDataCreator {
    constructor() {
        this.workbook = null;
        this.data = {
            resources: [],
            clients: [],
            installations: [],
            contracts: [],
            contractServices: [],
            installationServices: [],
            visits: []
        };
    }

    async loadExcelData() {
        console.log('📊 Loading Excel data...');
        
        this.workbook = new ExcelJS.Workbook();
        const filePath = path.join(__dirname, './GEP_DEMO_DATA.xlsx');
        
        await this.workbook.xlsx.readFile(filePath);
        
        // Extract data from each sheet
        await this.extractResources();
        await this.extractClients();
        await this.extractInstallations();
        
        console.log('✅ Excel data loaded successfully');
        this.logDataSummary();
    }

    async extractResources() {
        const worksheet = this.workbook.getWorksheet('Resources');
        if (!worksheet) return;

        for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
            const row = worksheet.getRow(rowNum);
            if (row.getCell(1).value) {
                this.data.resources.push({
                    code: row.getCell(1).value,
                    name: row.getCell(2).value,
                    specialty: row.getCell(3).value,
                    city: row.getCell(4).value
                });
            }
        }
    }

    async extractClients() {
        const worksheet = this.workbook.getWorksheet('Client');
        if (!worksheet) return;

        for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
            const row = worksheet.getRow(rowNum);
            if (row.getCell(2).value) {
                this.data.clients.push({
                    groupName: row.getCell(1).value,
                    companyCode: row.getCell(2).value,
                    isActive: row.getCell(3).value,
                    companyName: row.getCell(4).value,
                    companyType: row.getCell(5).value,
                    afm: row.getCell(6).value,
                    accountManager: row.getCell(7).value
                });
            }
        }
    }

    async extractInstallations() {
        const worksheet = this.workbook.getWorksheet('Installation');
        if (!worksheet) return;

        for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
            const row = worksheet.getRow(rowNum);
            if (row.getCell(1).value) {
                this.data.installations.push({
                    installationCode: row.getCell(1).value,
                    description: row.getCell(2).value,
                    category: row.getCell(3).value,
                    isActive: row.getCell(4).value,
                    totalEmployees: row.getCell(8).value,
                    companyCode: row.getCell(9).value,
                    address: row.getCell(10).value,
                    postCode: row.getCell(12).value,
                    workHours: row.getCell(13).value
                });
            }
        }
    }

    logDataSummary() {
        console.log('\n📋 Data Summary:');
        console.log(`Resources: ${this.data.resources.length}`);
        console.log(`Clients: ${this.data.clients.length}`);
        console.log(`Installations: ${this.data.installations.length}`);
    }

    async clearDatabase() {
        console.log('\n🗑️ Clearing existing data...');
        
        const tables = [
            'email_log',
            'optimization_results',
            'partner_availability',
            'assignments',
            'customer_requests',
            'installations',
            'clients',
            'partners'
        ];

        for (const table of tables) {
            try {
                const { error } = await supabaseAdmin.from(table).delete().neq('id', 0);
                if (error && !error.message.includes('does not exist')) {
                    console.warn(`Warning clearing ${table}:`, error.message);
                }
            } catch (e) {
                console.warn(`Warning clearing ${table}:`, e.message);
            }
        }
        
        console.log('✅ Database cleared');
    }

    async createPartners() {
        console.log('\n👥 Creating partners...');
        
        const specialtyMap = {
            'Παθολόγος': 'occupational_doctor',
            'Ιατρός': 'occupational_doctor',
            'Παιδίατρος': 'occupational_doctor',
            'Ειδικός Ιατρός Εργασίας': 'occupational_doctor',
            'Μηχανικός Δομικών Έργων ΤΕ': 'safety_engineer',
            'Μηχανολόγος Μηχανικός': 'safety_engineer',
            'Μηχανικός Παραγωγής & Διοίκησης': 'safety_engineer',
            'Ηλεκτρολόγος Μηχανικός': 'safety_engineer',
            'Μηχανολόγος Μηχανικός ΤΕ': 'safety_engineer'
        };

        const partnersData = this.data.resources.map(resource => {
            const specialty = specialtyMap[resource.specialty] || 'occupational_doctor';
            const rate = specialty === 'occupational_doctor' ? 
                Math.round((75 + Math.random() * 15) * 100) / 100 : 
                Math.round((65 + Math.random() * 15) * 100) / 100;

            return {
                id: resource.code,
                name: resource.name,
                specialty: specialty,
                city: resource.city,
                hourly_rate: rate,
                email: this.generateEmail(resource.name),
                phone: this.generatePhone(),
                max_hours_per_week: 40,
                is_active: true
            };
        });

        const { error } = await supabaseAdmin.from('partners').insert(partnersData);
        if (error) throw error;
        
        console.log(`✅ Created ${partnersData.length} partners`);
        return partnersData;
    }

    async createClients() {
        console.log('\n🏢 Creating clients...');
        
        const clientsData = this.data.clients.map(client => ({
            company_code: client.companyCode,
            group_name: client.groupName,
            company_name: client.companyName,
            company_type: client.companyType,
            afm: client.afm,
            account_manager: client.accountManager,
            is_active: Boolean(client.isActive)
        }));

        const { error } = await supabaseAdmin.from('clients').insert(clientsData);
        if (error) throw error;
        
        console.log(`✅ Created ${clientsData.length} clients`);
        return clientsData;
    }

    async createInstallations() {
        console.log('\n🏭 Creating installations...');
        
        const installationsData = this.data.installations
            .filter(inst => inst.isActive === 1)
            .map(installation => ({
                installation_code: installation.installationCode,
                company_code: installation.companyCode,
                description: installation.description,
                address: installation.address,
                post_code: installation.postCode,
                category: installation.category,
                employees_count: installation.totalEmployees || 0,
                work_hours: installation.workHours,
                is_active: Boolean(installation.isActive),
                latitude: 37.9755 + (Math.random() - 0.5) * 0.1,
                longitude: 23.7348 + (Math.random() - 0.5) * 0.1
            }));

        const { error } = await supabaseAdmin.from('installations').insert(installationsData);
        if (error) throw error;
        
        console.log(`✅ Created ${installationsData.length} installations`);
        return installationsData;
    }

    async createCustomerRequests() {
        console.log('\n📝 Creating customer requests...');
        
        const installations = await supabaseAdmin.from('installations').select('*');
        if (installations.error) throw installations.error;
        
        const requests = [];
        const serviceTypes = ['occupational_doctor', 'safety_engineer'];
        
        installations.data.forEach((installation, index) => {
            const serviceType = serviceTypes[index % 2];
            const startDate = new Date('2025-09-01');
            startDate.setDate(startDate.getDate() + (index * 5));
            
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);
            
            requests.push({
                client_name: 'DEMO HELLAS ΑΝΩΝΥΜΗ ΕΜΠΟΡΙΚΗ ΕΤΑΙΡΙΑ ΕΜΠΟΡΙΑΣ',
                installation_address: installation.address,
                service_type: serviceType,
                employee_count: installation.employees_count,
                installation_category: installation.category,
                work_hours: installation.work_hours,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                special_requirements: serviceType === 'occupational_doctor' ? 
                    'Τακτική επίσκεψη ιατρού εργασίας' : 
                    'Εκτίμηση επαγγελματικού κινδύνου',
                estimated_hours: serviceType === 'occupational_doctor' ? 
                    Math.max(4, installation.employees_count * 0.25) :
                    Math.max(2, installation.employees_count * 0.1),
                max_budget: serviceType === 'occupational_doctor' ? 
                    installation.employees_count * 20 : 
                    installation.employees_count * 15,
                status: index < 3 ? 'pending' : 'assigned'
            });
        });

        const { error } = await supabaseAdmin.from('customer_requests').insert(requests);
        if (error) throw error;
        
        console.log(`✅ Created ${requests.length} customer requests`);
        return requests;
    }

    async createPartnerAvailability() {
        console.log('\n📅 Creating partner availability...');
        
        const partners = await supabaseAdmin.from('partners').select('id');
        if (partners.error) throw partners.error;
        
        const availability = [];
        const startDate = new Date('2025-09-01');
        const endDate = new Date('2025-12-01');
        
        partners.data.forEach(partner => {
            const current = new Date(startDate);
            while (current <= endDate) {
                if (current.getDay() !== 0 && current.getDay() !== 6) {
                    const availableHours = 8;
                    const bookedHours = Math.random() < 0.3 ? Math.floor(Math.random() * 4) : 0;
                    
                    availability.push({
                        partner_id: partner.id,
                        date: current.toISOString().split('T')[0],
                        available_hours: availableHours,
                        booked_hours: bookedHours,
                        is_available: bookedHours < availableHours
                    });
                }
                current.setDate(current.getDate() + 1);
            }
        });

        const batchSize = 500;
        for (let i = 0; i < availability.length; i += batchSize) {
            const batch = availability.slice(i, i + batchSize);
            const { error } = await supabaseAdmin.from('partner_availability').insert(batch);
            if (error) throw error;
            console.log(`Inserted ${i + batch.length}/${availability.length} availability records`);
        }
        
        console.log(`✅ Created ${availability.length} availability records`);
    }

    generateEmail(name) {
        const clean = name.toLowerCase()
            .replace(/\s+/g, '.')
            .replace(/[^a-z.]/g, '');
        return `${clean}@gep-demo.com`;
    }

    generatePhone() {
        return `+3021${Math.floor(1000000 + Math.random() * 9000000)}`;
    }

    async createDemo() {
        try {
            console.log('🚀 Starting GEP Demo Database Creation');
            console.log('=====================================');
            
            await this.loadExcelData();
            await this.clearDatabase();
            
            await this.createPartners();
            await this.createClients();
            await this.createInstallations();
            await this.createCustomerRequests();
            await this.createPartnerAvailability();
            
            console.log('\n🎉 Demo database created successfully!');
            console.log('\n📊 Summary:');
            console.log(`✅ ${this.data.resources.length} partners`);
            console.log(`✅ ${this.data.clients.length} clients`);
            console.log(`✅ Active installations`);
            console.log(`✅ Customer requests`);
            console.log(`✅ Partner availability records`);
            
        } catch (error) {
            console.error('❌ Demo database creation failed:', error);
            throw error;
        }
    }
}

// Run the demo creation
if (require.main === module) {
    const creator = new DemoDataCreator();
    creator.createDemo().catch(console.error);
}

module.exports = DemoDataCreator;