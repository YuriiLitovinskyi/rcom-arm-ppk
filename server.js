const MongoClient = require('mongodb').MongoClient;
const prompts = require('prompts');

const url = 'mongodb://localhost:27017/DBClientsPPK';

(() => {
    MongoClient.connect(url, async (err, db) => {
        if(err) {            
            console.log('No connection to Database! Please start MongoDB service on default port 27017!\n');                       
            
            console.log(err);
            await sleep(10000);           
        } else {
            console.log('Connected to database successfully!\n'); 

            (async () => {            
                const ppkNumber = await prompts({
                    type: 'number',
                    name: 'value',
                    message: 'Enter ppk number: ',
                    validate: value => value <= 0 || value > 1000 ? `Please enter a valid ppk number from 1 to 1000` : true
                });

                const ppkGroup = await prompts({
                    type: 'number',
                    name: 'value',
                    message: 'Enter group number: ',
                    validate: value => value <= 0 || value > 4 ? `Please enter a valid group number from 1 to 4` : true
                });

                const ppkSerialNumber = await prompts({
                    type: 'number',
                    name: 'value',
                    message: 'Enter ppk serial number: ',
                    validate: value => value <= 0 || value > 32767 ? `Please enter a valid ppk serial number from 1 to 32767` : true
                });

                const ppkPassword = await prompts({
                    type: 'number',
                    name: 'value',
                    message: 'Enter ppk password: ',
                    validate: value => value < 100000 || value > 999999 ? `Please enter a valid ppk password from 100000 to 999999` : true
                });
    
                validateAndSendArm(db, ppkNumber.value, ppkGroup.value, ppkSerialNumber.value, ppkPassword.value);
            })();
        };       
    });
})();


const sleep = (timeout) => {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);        
    });
};

const validateAndSendArm = (db, ppkNum, groupNum, ppkSerial, ppkPass) => {
    db.collection('ppkState', async (err, collection) => {
        if(err) {
            console.log(err);
            db.close();
            await sleep(10000);
        };

        const ppk = await collection.find({ ppk_num: ppkNum }).toArray();

        const numStr = groupNum.toString();
        
        if (ppk.length === 0){
            console.log(`\nPpk number ${ppkNum} wasn't found in database... \nApplication will be closed automatically in 10 seconds`);
            db.close();
            await sleep(10000);
        } else if (ppk[0].lastActivity && ppk[0].lastActivity < (Date.now() - 4 * 60 * 1000)){
            console.log(`\nPpk number ${ppkNum} is offline at the moment... \nApplication will be closed automatically in 10 seconds`);
            db.close();
            await sleep(10000);
        } else if (ppk[0].groups && Object.keys(ppk[0].groups).indexOf(numStr) !== -1){          
                if (Object.entries(ppk[0].groups).some(([key, value]) => key === numStr && value === 1)) {   
                    console.log(`\nGroup number ${groupNum} is already armed! \nApplication will be closed automatically in 10 seconds`);
                    db.close();
                    await sleep(10000);
                } else {
                    armGroup(db, ppkNum, groupNum, ppkSerial, ppkPass, async () => {                    
                        console.log(`\nCommand Arm group ${groupNum} was successfully sent to ppk number ${ppkNum}`);
                        console.log('Application will be closed automatically in 20 seconds');
                       
                        db.close();    
                        await sleep(20000);
                    });
                }  
        } else {
            console.log(`\nGroup number ${groupNum} doesn't exist in ppk number ${ppkNum}... \nApplication will be closed automatically in 10 seconds`);
            db.close();
            await sleep(10000);
        }       
    });
};

const armGroup = (db, ppk_num, group_num, serial_num, ppk_pass, callback) => {
    db.collection('ppkCommandQueue', async (err, collection) => {
        if(err) {
            console.log(err);
            db.close();
            await sleep(10000);
        };
        
        await collection.insertOne({ 
            ppkNum : ppk_num,
            message: "TASK",
            time: Date.now(),
            task: `GROUP${group_num}_ON`,   
            mobileKey: serial_num.toString(),
            password: ppk_pass.toString()
        }, async (err, result) => {
            if(err){
                console.log(err);
                db.close();
                await sleep(10000);
            };         
            console.log(`${result}\n`);
        });
        callback();
    });
};

