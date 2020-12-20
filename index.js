#!/usr/bin/env node
'use strict';

const parse = require('csv-parse');
const fs = require('fs');

module.exports.annotateCSV = annotateCSV;


// Ran as test or shell script
if (require.main === module) {
    commandLine();
}

async function commandLine() {
    // Run test scripts if mode is test
    if (process.env.NODE_TEST === 'test') {
        const annotatedCSV = await annotateCSV('./test/invalidCSVTest.csv', ',');
        console.log(JSON.stringify(annotatedCSV));
        // OUTPUT: './test/test1.json'
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

