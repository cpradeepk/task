const settings = [
    { key: "task_statuses", value: ["Open", "In Progress", "Done", "On Hold"] },
    { key: "task_priorities", value: ["Low", "Medium", "High", "Critical"] },
    { key: "bug_types", value: ["Bug", "Feature", "Testcase", "Other"] },
    { key: "bug_statuses", value: ["New", "In Progress", "Resolved", "Closed", "Reopened"] },
    { key: "bug_severities", value: ["Critical", "High", "Medium", "Low"] },
    { key: "bug_categories", value: ["UI", "Functionality", "Performance", "Security", "Other"] },
    { key: "bug_priorities", value: ["Low", "Medium", "High", "Critical"] },
    { key: "platforms", value: ["Web", "iOS", "Android", "Desktop", "API"] },
    { key: "departments", value: ["Engineering", "Product", "Design", "Marketing", "Sales", "HR", "Finance"] },
    { key: "designations", value: ["Software Engineer", "Senior Engineer", "Product Manager", "Designer", "QA Engineer"] }
];

async function seed() {
    console.log("Starting DB Seeding via API...");
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const s of settings) {
        try {
            const res = await fetch('http://localhost:3000/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: s.key,
                    value: s.value,
                    createdBy: 'SYSTEM',
                    description: 'Seeded via script'
                })
            });

            if (res.status === 201) {
                console.log(`✅ Created ${s.key} `);
                successCount++;
            } else if (res.status === 409) {
                console.log(`ℹ️ Skipped ${s.key} (Already exists)`);
                skipCount++;
            } else {
                const text = await res.text();
                console.error(`❌ Failed ${s.key}: ${res.status} - ${text} `);
                errorCount++;
            }
        } catch (e) {
            console.error(`❌ Connection Failed for ${s.key}: ${e.message} `);
            console.error("Make sure the Next.js server is running on localhost:3000");
            process.exit(1);
        }
    }

    console.log(`\nSeeding Complete: ${successCount} created, ${skipCount} skipped, ${errorCount} errors.`);
}

seed();
