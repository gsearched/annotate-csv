#!/usr/bin/env node
'use strict';

const parse = require('csv-parse');
const fs = require('fs');
const assert = require('assert');

module.exports.annotateCSV = annotateCSV;

let DEBUG_MODE = false;


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
        console.log(JSON.stringify(annotatedCSV, null, 4));
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

    const invalidVersion = await annotateCSV('./test/invalidVersionCSVTest.csv', ',');
    try {
        assert.equal(invalidVersion.hasError, true);
        assert.equal(invalidVersion.errors[0].error, 'VERSION_NOT_SUPPORTED');
        console.log(`PASSED: Version Not Supported Error`);
    } catch (e) {
        console.log(e);
        console.log(`FAILED: Version Not Supported Error`);
        passedTest = false;
    }

    const validCSV = await annotateCSV('./test/validCSVTest.csv', ',');
    try {
        assert.equal(validCSV.hasError, false);
        console.log(`PASSED: Parsing valid CSV`);
        console.log(JSON.stringify(validCSV, null, 4));
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

    console.log(`Unknown Error: ${JSON.stringify(error, null, 4)}

`);
    console.log(error);
    console.log(' ');

    return 'UNKNOWN';
}

async function annotateCSV(inputFile, delimiter) {
    let hasError = false;
    let content = {};
    const errors = [];
    try {
        const rawRows = await rawCSVRows(inputFile, delimiter);
        content = annotateRawRows(rawRows);
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
        if (DEBUG_MODE) {
            console.log(`Found Following Errors: 
            ${JSON.stringify(errors, null, 4)}
            `);
        }
        hasError = true;
    }

    return {
        hasError,
        errors,
        content
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

const supportedVersions = ['0.1.0'];

function annotateRawRows(rawRows) {
    const annotatedCSV = {
        metadata: {},
        rows: [],
        annotations: [],
    };

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

    const { getAnnotationKey, getAnnotationArray } = createAnnotationKeyStore();

    parseMetadataAndInsertAnnotated(rawMetaRows, annotatedCSV, getAnnotationKey);
    parseTableAndInsertAnnotated(rawTableRows, annotatedCSV, getAnnotationKey);
    annotatedCSV.annotations.push(...getAnnotationArray());

    return annotatedCSV;
}

/// Stores annotations 
function createAnnotationKeyStore() {
    const annotations = new Map();
    let annotationCount = 0;
    return {
        getAnnotationKey: function getAnnotationKey(annotation) {
            if (annotations.has(annotation)) {
                return annotations.get(annotation);
            } else {
                annotations.set(annotation, annotationCount);
                annotationCount++;
                return annotations.get(annotation);
            }
        },
        getAnnotationArray: function getAnnotationArray() {
            console.log('ANNOTATIONS!!!!');
            console.log ( `${[...annotations.keys()]}`);
            return [...annotations.keys()];
        }
    };
}

function parseMetadataAndInsertAnnotated(rawMetaRows, annotatedCSV, getAnnotationKey) {
    console.log('#METADATA ROWS');
    rawMetaRows.forEach((rawMetaRow, index) => { 
        const metaKey = getJSONMetadataKey(rawMetaRow[0]);

        // If meta row is an annotation we need to loop backwards, in case of 
        // multiple annotations for the same header to find the closest meta key.
        // We then push the annotation key to the meta key
        if (metaKey === 'annotation') {
            const annotationKey = getAnnotationKey(rawMetaRow[1]);
            let prevIndex = index;
            let prevMetaKey = '';
            do {
                prevIndex--;
                prevMetaKey = getJSONMetadataKey(rawMetaRows[prevIndex][0]); 
            // Loop backwards to find first non annotated field
            } while (prevMetaKey === 'annotation');

            annotatedCSV.metadata[prevMetaKey].annotations.push(annotationKey);

        } else if (metaKey === 'unknown') {
            throw 'META_FIELD_UNKNOWN';
        } else {
            annotatedCSV.metadata[metaKey] = {
                content: rawMetaRow[1],
                annotations: [],
            };
        }
    });
    return annotatedCSV;
}

function getJSONMetadataKey(csvKey) {
    switch (csvKey.trim()) {
        case '#TITLE':
            return 'title';
        case '#CITATION':
            return 'citation';
        case '#ANNOTATION':
            return 'annotation';
        case '#CITATION_URL':
            return 'citationUrl';
        case '#LICENSE':
            return 'license';
        default:
            return 'unknown';
    }
}

function parseTableAndInsertAnnotated(rawTableRows, annotatedCSV) {
    // NEED to loop through rows and find which ones are headers, need to determine
    // cell JSON format 
    // HEADERS
    console.log('#DATA ROWS');

    rawTableRows.forEach((rawTableRow, index) => {


    });

    return annotatedCSV;
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

    Additional Error messages potentially returned by the library:

    * FILE_NOT_FOUND - Input file does not exist, or cannot be read
    * META_FIELD_UNKNOWN - Metadata section of CSV contains unsupported field.
    * MISSING_ANNOTATE_HEADER - The CSV file doesn't have the #ANNOTATE_CSV value in its first cell.
    * VERSION_NOT_SUPPORTED - Annotate CSV version not supported

    `);

}

