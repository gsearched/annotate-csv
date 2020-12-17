#!/usr/bin/env node
'use strict';

const parse = require('csv-parse');
const fs = require('fs');

let inputFile = false;
let outputFile = '/output.json';

if (process.env.NODE_TEST === 'test') {
    inputFile = './test/invalidCSVTest.csv';
    outputFile = './test/test1.json';
}

let delimiter = ',';

if (process.env.NODE_DELIMITER) {
    delimiter = process.env.NODE_DELIMITER;
}

if (inputFile) {
    commandLine(inputFile, outputFile);
}

async function commandLine(inputFile, outputFile) {
    const annotatedCSV = await annotateCSV(inputFile, delimiter);
    console.log(JSON.stringify(annotatedCSV));
}

async function annotateCSV(inputFile, delimiter) {
    let hasError = false;
    let annotation = {};
    const errors = [];
    try {
        const rawRows = await rawCSVRows(inputFile, delimiter);
        annotation = annotateRawRows(rawRows, errors);
    } catch (e) {
        console.log(`Error Processing ${inputFile}, ${JSON.stringify(e)}`);
        if (Array.isArray(e)) {
            errors.push(...e);
        } else {
            errors.push(e);
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

module.exports.annotateCSV = annotateCSV;


async function rawCSVRows(inputFile, delimiter = ',') {
    return new Promise((resolve, reject) => {
        const rawRows = [];

        fs.createReadStream(inputFile)
        .on('error', function (e) {
            console.log(`Error Creating Read Stream: ${JSON.stringify(e)}`);
            let error = 'Unknown';
            if (e.code === 'ENOENT') {
                error = 'File Not Found';
            }
            reject({ 
                error,
                rawError: JSON.stringify(e),
            });
        })
        .pipe(parse({
            delimiter
        }))
        .on('error', function (e) {
            console.log(`Error Parsing CSV: ${JSON.stringify(e)}`);
            let error = 'Unknown';
            if (e.code === 'ENOENT') {
                error = 'File Not Found';
            }
            reject({ 
                error,
                rawError: JSON.stringify(e),
            });
        })
        .on('readable', function(){
            let record;
            while (!!(record = this.read())) {
                rawRows.push(record);
            }
        })
        .on('end', function(){
            console.log('The number of objects in the array are' , rawRows.length , 'but it should be 4');
            console.log(rawRows);
            resolve(rawRows);
        });
    });
}

function annotateRawRows(rawRows) {
    const annotation = {};


    return annotation;
}
