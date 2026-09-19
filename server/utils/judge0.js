const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { normalizeOutput } = require('./helpers');

const TEMP_DIR = path.join(__dirname, '../temp');

// Temp directory bana agar nahi hai
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const executeCode = async (code, language, stdin = '') => {
  return new Promise((resolve, reject) => {
    const id = Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    let srcFile, compileCmd, runCmd;

    const lang = language?.toLowerCase();

    if (lang === 'cpp' || lang === 'c++') {
      srcFile = path.join(TEMP_DIR, `${id}.cpp`);
      const outFile = path.join(TEMP_DIR, `${id}.exe`);
      const inputFile = path.join(TEMP_DIR, `${id}.txt`);
      fs.writeFileSync(srcFile, code);
      fs.writeFileSync(inputFile, stdin);

      compileCmd = `g++ "${srcFile}" -o "${outFile}"`;
      runCmd = `"${outFile}" < "${inputFile}"`;

      exec(compileCmd, { timeout: 10000 }, (compileErr, _, compileStderr) => {
        if (compileErr) {
          cleanup([srcFile, outFile, inputFile]);
          return resolve({
            stdout: '',
            stderr: compileStderr || compileErr.message,
            status: { description: 'Compilation Error' },
            statusId: 6,
            isAccepted: false,
          });
        }

        exec(runCmd, { timeout: 5000 }, (runErr, stdout, stderr) => {
          cleanup([srcFile, outFile, inputFile]);
          if (runErr && runErr.killed) {
            return resolve({
              stdout: '',
              stderr: 'Time Limit Exceeded',
              status: { description: 'Time Limit Exceeded' },
              statusId: 5,
              isAccepted: false,
            });
          }
          resolve({
            stdout: stdout || '',
            stderr: stderr || '',
            status: { description: runErr ? 'Runtime Error' : 'Accepted' },
            statusId: runErr ? 11 : 3,
            isAccepted: !runErr,
          });
        });
      });

    } else if (lang === 'python') {
      srcFile = path.join(TEMP_DIR, `${id}.py`);
      const inputFile = path.join(TEMP_DIR, `${id}.txt`);
      fs.writeFileSync(srcFile, code);
      fs.writeFileSync(inputFile, stdin);
      runCmd = `python "${srcFile}" < "${inputFile}"`;

      exec(runCmd, { timeout: 5000 }, (runErr, stdout, stderr) => {
        cleanup([srcFile, inputFile]);
        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          status: { description: runErr ? 'Runtime Error' : 'Accepted' },
          statusId: runErr ? 11 : 3,
          isAccepted: !runErr,
        });
      });

    } else if (lang === 'java') {
      srcFile = path.join(TEMP_DIR, `Main_${id}.java`);
      const inputFile = path.join(TEMP_DIR, `${id}.txt`);
      fs.writeFileSync(srcFile, code);
      fs.writeFileSync(inputFile, stdin);
      compileCmd = `javac "${srcFile}"`;
      runCmd = `java -cp "${TEMP_DIR}" Main_${id} < "${inputFile}"`;

      exec(compileCmd, { timeout: 10000 }, (compileErr, _, compileStderr) => {
        if (compileErr) {
          cleanup([srcFile, inputFile]);
          return resolve({
            stdout: '',
            stderr: compileStderr || compileErr.message,
            status: { description: 'Compilation Error' },
            statusId: 6,
            isAccepted: false,
          });
        }
        exec(runCmd, { timeout: 5000 }, (runErr, stdout, stderr) => {
          cleanup([srcFile, inputFile]);
          resolve({
            stdout: stdout || '',
            stderr: stderr || '',
            status: { description: runErr ? 'Runtime Error' : 'Accepted' },
            statusId: runErr ? 11 : 3,
            isAccepted: !runErr,
          });
        });
      });

    } else if (lang === 'javascript') {
      srcFile = path.join(TEMP_DIR, `${id}.js`);
      const inputFile = path.join(TEMP_DIR, `${id}.txt`);
      fs.writeFileSync(srcFile, code);
      fs.writeFileSync(inputFile, stdin);
      runCmd = `node "${srcFile}" < "${inputFile}"`;

      exec(runCmd, { timeout: 5000 }, (runErr, stdout, stderr) => {
        cleanup([srcFile, inputFile]);
        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          status: { description: runErr ? 'Runtime Error' : 'Accepted' },
          statusId: runErr ? 11 : 3,
          isAccepted: !runErr,
        });
      });

    } else {
      reject(new Error(`Unsupported language: ${language}`));
    }
  });
};

// Temp files cleanup
function cleanup(files) {
  files.forEach(f => {
    try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
  });
}

const runTestCases = async (code, language, testCases) => {
  const results = [];

  for (const testCase of testCases) {
    try {
      const result = await executeCode(code, language, testCase.input);
      const actualOutput = normalizeOutput(result.stdout);
      const expectedOutput = normalizeOutput(testCase.expectedOutput);
      const passed = actualOutput === expectedOutput;

      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: result.stdout || '',
        passed,
        error: result.stderr || null,
        status: result.status?.description || 'Unknown',
        time: null,
      });
    } catch (error) {
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: '',
        passed: false,
        error: error.message,
        status: 'Error',
      });
    }
  }

  const allPassed = results.every((r) => r.passed);
  return { results, allPassed };
};

module.exports = { executeCode, runTestCases };