#!/usr/bin/env node
'use strict';

const parse = require('csv-parse');
const fs = require('fs');
const assert = require('assert');

module.exports.annotateCSV = annotateCSV;


// Ran as test or shell script
if (require.main === module) {
    commandLine();
}

async function commandLine() {
    // Run test scripts if mode is test
    if (process.env.NODE_TEST === 'test') {
        const passedTest = await test();
        if (passedTest) {
            console.log('Passed All Tests');
        } else {
            console.error('Failed At Least One Test');
        }
    } else {
        const args = require('minimist')(process.argv.slice(2));

        if (!args.input) {
            return helpMessage('Missing Input Field');            
        }
        if (!args.output) {
            return helpMessage('Missing Output Field');            
        }

        //commandLine(args.input, args.output, args.delimiter);
        const annotatedCSV = await annotateCSV(args.input, args.delimiter);
        console.log(JSON.stringify(annotatedCSV));
    }
}


async function test() {
    let passedTest = true;
    // Fake File Test
    const fakeFile = await annotateCSV('./test/fakeFile.csv', ',');
    try {
        assert.equal(fakeFile.hasError, true);
        assert.equal(fakeFile.errors[0].error, 'FILE_NOT_FOUND');
        console.log(`PASSED: File Does Not Exist Test`);
    } catch (e) {
        console.log(e);
        console.log(`FAILED: File Does Not Exist Test`);
        passedTest = false;
    }

    const badRecordLength = await annotateCSV('./test/invalidCSVTest.csv', ',');
    try {
        assert.equal(badRecordLength.hasError, true);
        assert.equal(badRecordLength.errors[0].error, 'CSV_INCONSISTENT_RECORD_LENGTH');
        console.log(`PASSED: Invalid Record Length Check`);
    } catch (e) {
        console.log(e);
        console.log(`FAILED: Invalid Record Length Check`);
        passedTest = false;
    }

    const missingHeader = await annotateCSV('./test/invalidHeaderCSVTest.csv', ',');
    try {
        assert.equal(missingHeader.hasError, true);
        assert.equal(missingHeader.errors[0].error, 'MISSING_ANNOTATE_HEADER');
        console.log(`PASSED: Parsing invalid Header CSV check`);
    } catch (e) {
        console.log(e);
        console.log(`FAILED: Parsing invalid Header CSV check`);
        passedTest = false;
    }

    const validCSV = await annotateCSV('./test/validCSVTest.csv', ',');
    try {
        assert.equal(validCSV.hasError, false);
        console.log(`PASSED: Parsing valid CSV`);
    } catch (e) {
        console.log(e);
        console.log(`FAILED: Parsing valid CSV`);
        passedTest = false;
    }

    // OUTPUT: './test/test1.json'
    return passedTest;
}

function getErrorCode(error) {
    if (error.code === 'ENOENT') {
        return 'FILE_NOT_FOUND';
    }

    if (typeof error === 'string') {
        return error;
    }

    if (error.error) {
        return error.error;
    }

    if (error.code) {
        return error.code;
    }

    return 'UNKNOWN';
}

async function annotateCSV(inputFile, delimiter) {
    let hasError = false;
    let annotation = {};
    const errors = [];
    try {
        const rawRows = await rawCSVRows(inputFile, delimiter);
        annotation = annotateRawRows(rawRows);
    } catch (e) {
        if (Array.isArray(e)) {
            errors.push(...e.map((error) => {
                return { 
                    error: getErrorCode(error),
                    rawError: error,
                };
            }));
        } else {
            errors.push({
                error: getErrorCode(e),
                rawError: e,
            });
        }
    }

    if (errors.length > 0) {
        hasError = true;
    }

    return {
        hasError,
        errors,
        annotation
    };
}

async function rawCSVRows(inputFile, delimiter = ',') {
    return new Promise((resolve, reject) => {
        const rawRows = [];

        fs.createReadStream(inputFile)
        .on('error', function (e) {
            reject(e);
        })
        .pipe(parse({
            delimiter
        }))
        .on('error', function (e) {
            reject(e);
        })
        .on('readable', function(){
            let record;
            while (!!(record = this.read())) {
                rawRows.push(record);
            }
        })
        .on('end', function(){
            resolve(rawRows);
        });
    });
}

const supportedVersions = ['1.0.0'];

function annotateRawRows(rawRows) {
    const annotation = {};
    const annotateHeader = (rawRows[0][0] || '').trim();
    const version = (rawRows[0][1] || 'UNKNOWN').trim();

    if (annotateHeader !== '#ANNOTATE_CSV') {
        throw 'MISSING_ANNOTATE_HEADER';
    }

    if (!supportedVersions.includes(version)) {
        throw 'VERSION_NOT_SUPPORTED';
    }

    const rawMetaRows = [];
    const rawTableRows = [];
    let mode = 'HEADER'; // || 'META' || 'TABLE;
    rawRows.forEach((row, index) => {
        if (row[0].trim() === '#METADATA') {
            mode = 'META';
            return;
        }
        if (row[0].trim() === '#TABLE') {
            mode = 'TABLE';
            return;
        }

        if (mode === 'META') {
            rawMetaRows.push(row);
        }
            
        if (mode === 'TABLE') {
            rawTableRows.push(row);
        }
    });

    annotation.metadata = getMetadata(rawMetaRows);

    console.log(JSON.stringify(rawRows));

    return annotation;
}

function getMetadata(metaRows) {

    return {};
}

function helpMessage(errorMessage) {
    console.log(`
    ${errorMessage ? 'Error:' + errorMessage : '' }

    Annotate-CSV

    An opinionated Annotation system for CSV files. This parser converts 
    annotated CSV files into JSON and saves the output to the local file 
    system. This library can be used as a shell script or as an NPM package. 
    See https://github.com/gsearched/annotate-csv for more info.

    Usage:

    annotate-csv  --input <./annotated.csv> --output <./annotated.json> [--delimiter <",">]

    Options:

    --input The file location of the annotated csv file to parse *Required*

    --output The file location of where to save the json output *Required*

    --delimiter The CSV delimiter, defaults to "," *Optional*

    Errors:

    Annotate-CSV uses the csv-parse library to do the initial parsing 
    and will output any errors it encounters. See 
    https://csv.js.org/parse/errors/ 
    for a list of possible errors and how to remedy. 

    `);

}

