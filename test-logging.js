const { createOilChangeLog } = require('./apiService');

async function testLogging() {
    console.log('Testing oil change logging functionality...');
    
    try {
        // Test creating initial log with parent_id = null
        const initialLog = await createOilChangeLog(
            123, // mechanicId
            null, // parent_id = null for initial log
            1, // step = 1
            "passed", // status
            "1", // details = full message
            "Started oil change flow" // message = single line summary
        );
        
        if (initialLog && initialLog.id) {
            console.log('✅ Initial log created successfully:', initialLog.id);
            
            // Test creating subsequent log with parent_id
            const subsequentLog = await createOilChangeLog(
                123, // mechanicId
                initialLog.id, // parent_id = log ID from previous step
                2, // step = 2
                "passed", // status
                "Bot requested QR codes photo", // details = full bot message
                "Bot requested QR codes photo" // message = single line summary
            );
            
            if (subsequentLog && subsequentLog.id) {
                console.log('✅ Subsequent log created successfully:', subsequentLog.id);
                console.log('✅ Logging functionality is working correctly!');
            } else {
                console.log('❌ Failed to create subsequent log');
            }
        } else {
            console.log('❌ Failed to create initial log');
        }
    } catch (error) {
        console.error('❌ Error testing logging:', error.message);
    }
}

// Run the test
testLogging();
