# serverless-dynamodb-fixtures-plugin

This will help you load up some static data into your DynamoDB tables.

Useful for either canned data or to provide consistent test-data across environments.

## Usage

Create a fixtures directory in the root of your project.  Populate it with json files of the format:

````
{
  "tableName": "${process.env.SERVERLESS_STAGE}-${process.env.SERVERLESS_PROJECT}-car",
  "keyName": "id",
  "entries":[
    {"id":"test-car-1", "make":"Subaru Forrester", "mileage":32000, "year":2010},
    {"id":"test-car-2", "make":"Audi TT", "mileage":132000, "year":2004},
    {"id":"test-car-3", "make":"Ford Mustang", "mileage":57021, "year":2016},
    {"id":"test-car-4", "make":"Delorean", "mileage":2000000, "year":1986},
    {"id":"test-car-5", "make":"Intentionally Missing Mileage", "year":2010},
    {"id":"test-car-${process.env.SERVERLESS_STAGE}", "make":"Intentionally Missing Mileage", "year":2010}
  ]
}
````

Then run:

> sls dynamoddb load
