# annotate-csv
Opinionated annotated csv format and parser written in Javascript that converts an annotated csv file into JSON that can be more easily manipulated by programming languages.

An annotated csv file has it's metadata embedded inside the CSV itself. This allows for the csv file to be the sole source of information about the data and eliminates the need to store metadata about the csv file in a separate system.

## Using annotate-csv 

### NodeJS

Parses Annotated CSV file and returns JavaScript Object

### Command Line

Converts annotated CSV to JSON:

```
$ annotate-csv --input ./input.csv ---output ./output.json --delimiter "," 
```

#### Options:

* --input The file location of the annotated csv file to parse *Required*
* --output The file location of where to save the json output *Required*
* --delimiter The CSV delimiter, defaults to "," *Optional*



### Errors

Annotate-CSV uses the csv-parse library to do the initial parsing and will output any errors it encounters. See https://csv.js.org/parse/errors/ for a list of possible errors and how to remedy. 

Additional Error messages potentially returned by the library:

* FILE_NOT_FOUND - Input file does not exist, or cannot be read
* META_FIELD_UNKNOWN - Metadata section of CSV contains unsupported field.
* MISSING_ANNOTATE_HEADER - The CSV file doesn't have the #ANNOTATE_CSV value in its first cell.
* VERSION_NOT_SUPPORTED - Annotate CSV version not supported

#### NodeJS 

The return object is in this shape:

```
{
    hasError: false, // Were there errors 
    errors: [...], // Array of errors encounted
    content: {...}, // Javascript object containing parsed data
}

```
An error object looks like:
```
{
    error: 'Reading CSV', // Error Type 
    rawException: '', // JSON.stringified output of exception caught 
    additionalInfo: '', // Optional additional info about exception
}
```



## Sample Annotated CSV Format

```
#ANNOTATE_CSV,0.1.0,https://github.com/gsearched/annotate-csv,,,,,,,,,,,
#METADATA,,,,,,,,,,,,,
#TITLE,Average indoor environmental conditions simulated in each room of the TIEQ lab.,,,,,,,,,,,,
#ANNOTATION,#ABBR:TIEQ:Total Indoor Environmental Quality lab,,,,,,,,,,,,
#CITATION,"Allen JG, MacNaughton P, Satish U, Santanam S, Vallarino J, Spengler JD. 2016. Associations of cognitive function scores with carbon dioxide, ventilation, and volatile organic compound exposures in office workers: a controlled exposure study of green and conventional office environments. Environ Health Perspect 124:805–812; http://dx.doi.org/10.1289/ehp.1510037",,,,,,,,,,,,
#CITATION_URL,http://dx.doi.org/10.1289/ehp.1510037,,,,,,,,,,,,
#LICENSE,"EHP is an open-access journal published with support from the National Institute of Environmental Health Sciences, National Institutes of Health. All content is public domain unless otherwise noted. ",,,,,,,,,,,,
#TABLE,,,,,,,,,,,,,
,#HEADER,,,,,,,,,,,,
#HEADER,Variable,Day 1 Green+,Day 1 Green+,Day 2 Moderate CO2,Day 2 Moderate CO2,Day 3 High CO2,Day 3 High CO2,Day 4 Green,Day 4 Green,Day 5 Conventional,Day 5 Conventional,Day 6 Green+,Day 6 Green+
#HEADER,Date,4-Nov,4-Nov,5-Nov,5-Nov,6-Nov,6-Nov,11-Nov,11-Nov,12-Nov,12-Nov,13-Nov,13-Nov
#HEADER,Day of the week,Tuesday,Tuesday,Wednesday,Wednesday,Thursday,Thursday,Tuesday,Tuesday,Wednesday,Wednesday,Thursday,Thursday
#HEADER,Room,502,503,502,503,502,503,502,503,502,503,502,503
,CO2 (ppm),563,609,906,962,"1,400","1,420",761b,726b,969,921,486,488
Tuesday,,,,,,,,"Average concentration from 1400 to 1700 hours was 926 ppm, but lower CO2 concentrations in the morning hours during the approach to steady state led to a lower average CO2 concentration.","Average concentration from 1400 to 1700 hours was 926 ppm, but lower CO2 concentrations in the morning hours during the approach to steady state led to a lower average CO2 concentration.",,,,
,Outdoor air ventilation (cfm/person),40,40,40,40,40,40,20,20,20,20,40,40
#ANNOTATION,"A constant air flow rate of 40 cfm/person was maintained on all study days, with 100% outdoor air used on days 1, 2, 3, and 6 and 50% outdoor air and 50% recirculated air used to achieve an outdoor air ventilation rate of 20 cfm/person on days 4 and 5.",,,,,,,,,,,,
,TVOCs (μg/m3),43.4,38.5,38.2,28.6,32.2,29.8,48.5,43.5,506,666,55.8,14.9
#ANNOTATION,#ABBR:TVOC:Total Volatile Organic Compound,,,,,,,,,,,,
#HEADER,Other environmental parameters,,,,,,,,,,,,
,Temperature (°C),23.9,24.5,22.4,23.9,21.3,22,22.9,23.7,21.8,22.5,20.7,21.3
,Relative humidity (%),31,30.4,34.2,31.6,38.7,38.3,34.3,33.3,39.6,38.3,27.8,26.8
,NO2 (μg/m3),57.9,58.9,53.2,54.1,60.8,58.4,51.3,45.6,54.6,50.8,56.5,55.5
,O3 (μg/m3),3.42,21.2,14.4,13,1.37,0,6.85,238,1.71,1.37,4.11,6.85
,PM2.5 (μg/m3),2.38,3.49,3.35,2.58,2.97,2.42,1.26,1.83,1.68,1.34,1.26,1.38
,Noise (dB),51.3,49.9,49.7,48.8,52.5,48.8,49.6,48.7,51.1,48.8,50.5,49.2
,Illuminance (mV),2.95,2.7,2.89,2.83,2.31,2.04,3.11,2.93,2.74,2.51,2.39,2.28
,Irradiance (mV),9.07,8.76,9.45,9.37,6,6.05,9.9,9.6,8.3,8.14,6.7,6.82
```

## Metadata

Metadata fields are prefixed by the `#` symbol. There are two primary sections to an annotated CSV file, the `#METADATA` and the `#TABLE` sections. 

### ANNOTATE CSV HEADER

An annotatated CSV's first line is #ANNOTATE_CSV followed by the version number, and git repository location, followed by commas matching how many columns are in the document

```
#ANNOTATE_CSV,0.1.0,https://github.com/gsearched/annotate-csv,,,,,,,,,,,
```


### #ANNOTATIONs

Annotations are the heart of this format. Sometimes a cell or multiple cells in a ccsv need additional explanation. There are two types of annotations, text, and abbreviations. A header cell or a content cell can be annotated. If multiple cells need to have the same annotation, duplicate the annotation for each cell, and the parser will recognize they are duplicates. 

* `#ANNOTATION` : Is added to the first cell of a new row to signify that row of data contains annotations instead of data or header cells. 
* `#ABBR:$ABBREVIATION$:$Annotation$` : A special annotation that allows the parser to know that the annotation is spelling an abbreviation used in the cell immediately above. The parser will search for the abbreviation in the data cell above and be able to annotate it specifically. 
* Repeat Annotations : If an annotation needs to be applied to multiple data / header cells, repeat the annotation and the parser will recognize they are duplicates. 

### #METADATA Section

The `#METADATA` section is the first part of the annotated csv file. This is where the title, citation, and citation url are stored.

* `#METADATA` : Signifies the start of the metadata section. *Required
* `#TITLE` : The name of the dataset. *Required
* `#CITATION` : A citation of where the dataset came from
* `#CITATION_URL` : The URL of where to find the original source
* `#LICENSE` : The license of the dataset


### #TABLE Section

The table section is where the data in the data set is actually stored. The `#HEADER` annotation signifies that a data cell is a header and not actual data. Headers aand data cells can both be annotateed. If a header's value is repeated, the parser will recognize and will note 

* `#TABLE` : Signifies the start of the data set *Required
* `#HEADER` : Used to specify columns or rows that are headers. Column headers must be declared on the first line of the dataset. Row Headers can be declared on any row of the data set but the `#HEADER` annotation must be in the first cell of the row.
* Repeat Headers : If a header needs to span multiple cells, repeat the header and the parser will recognize it's a duplicate. If the header cell is left blank, it will be parsed as a blank header.

## JSON Format


## Sites using annotate-csv

* [Wellness Researched](https://wellnessresearched.com)
