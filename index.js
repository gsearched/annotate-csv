'use strict';

var csv = require('csv-parser');
var fs = require('fs');

const annotateCSV = async function annotateCSV(fileLocation) {
    let hasError = false;
    let annotation = {};
    const errors = [];
    try {
        const rawRows = await rawCSVRows(fileLocation, errors);
        annotation = annotateRawRows(rawRows, errors);
    } catch (e) {
        errors.push({ 
            error: 'Reading CSV',
            rawError: JSON.stringify(e),
        });
    }


    if (errors.length > 0) {
        hasError = true;
    }


    return {
        hasError,
        errors,
        annotation
    };
};

module.exports.annotateCSV = annotateCSV;


async function rawCSVRows(fileLocation) {
    return new Promise((resolve, reject) => {
        const rawRows = [];

        fs.createReadStream(fileLocation)
        .pipe(csv())
        .on('data', function (row) {
            try {
                rawRows.push(row);
            } catch (e) {
                console.log(e);
                reject(e);
            }
        })
        .on('end', function () {
            resolve(rawRows);
        });
    });
}

function annotateRawRows(rawRows) {
    const annotation = {};


    return annotation;
}
