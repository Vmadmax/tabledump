'use strict';

function dumpTableAsDefinition(context, item) {
	context.itemDefinition(item, function(creation) {
      SystemService.insertToClipboard(creation);
      SystemService.notify('Copy creation', item.type() + ' ' + item.name() + ' creation statement is copied!');
  });
}

function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter, index) {
    return letter.toUpperCase();
  }).replace(/\s+|-|_/g, '');
}

function getColumnMigrate(columnName, dataType, isNullable) {
   var typeArr = dataType.split("(");
   var typeOnly = typeArr[0];
   var typeLength = "";
   if (typeArr.length > 1) {
       typeLength = typeArr[1];
   }
   var migration = "";
   switch(typeOnly) {
	  case "varchar":
        if (typeLength.length > 0) {
            migration = "$table->string('" + columnName + "', " + typeLength + "";
        } else {
            migration = "$table->string('" + columnName + "')";          
        }
	  case "text":
	      migration = "$table->string('" + columnName + "')";
    case "int":
    case "int4":
          if (dataType.includes("unsigned")) {
              migration = "$table->bigIncrements('" + columnName + "')"
          } else {
              migration = "$table->integer('" + columnName + "')"            
          }
    case "tinyint":
          if (dataType.includes("unsigned")) {
              migration = "$table->unsignedTinyInteger('" + columnName + "')"
          } else {
              migration = "$table->tinyInteger('" + columnName + "')"            
          }
	  default:
	      migration = "$table->unsupported('" + columnName + "')";
	}
  if (isNullable.toLowerCase().charAt(0) == 'y') {
      migration += "->nullable()";
  }
  return migration + ";";
}

function dumpTableAsLaravel(context, item) {
// Currently only work with MySQL

  var nameCamelcase = camelize(item.name());
	var header = `<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

/**
 * Migration auto-generated by TablePlus ${Application.appVersion()}(${Application.appBuild()})
 * @author https://tableplus.com
 * @source https://github.com/TablePlus/tabledump
 */
class Create${nameCamelcase}Table extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('${item.name()}', function (Blueprint $table) {
`;
	var columnNames = [];
	var columnTypes = [];
  var isNullables = [];
  var defaultVals = [];
  var query;
  var driver = context.driver();
  switch (driver) {
      case 'MySQL':
          query = `SELECT ordinal_position as ordinal_position,column_name as column_name,column_type AS data_type,is_nullable as is_nullable,column_default as column_default,extra as extra,column_name AS foreign_key,column_comment AS comment FROM information_schema.columns WHERE table_schema='${item.schema()}'AND table_name='${item.name()}';`
          break;
      case 'PostgreSQL':
          query = `SELECT ordinal_position,column_name,udt_name AS data_type,numeric_precision,datetime_precision,numeric_scale,character_maximum_length AS data_length,is_nullable,column_name as check,column_name as check_constraint,column_default,column_name AS foreign_key,pg_catalog.col_description(16402,ordinal_position) as comment FROM information_schema.columns WHERE table_name='${item.name()}'AND table_schema='${item.schema()}';`
          break;
      default:
          context.alert('Rrror', driver + ' is not supported');
          return;
  }
	context.execute(query, (res) => {
	    res.rows.forEach((row) => {
	        let columnName = row.raw('column_name');
	        let columnType = row.raw('data_type');
          let isNullable = row.raw('is_nullable');
          let defaultVal = row.raw('column_default');
	        columnNames.push(columnName);
	        columnTypes.push(columnType);
          isNullables.push(isNullable);
          defaultVals.push(defaultVal);
	    });
	    var result = header;
	    for (let i = 0; i < columnNames.length; i++) { 
	    	var columnMigrate = getColumnMigrate(columnNames[i], columnTypes[i], isNullables[i]);
	    	result += `            ${columnMigrate}\n`;
	    };
	    result += `        });
    }
	 
    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('${item.name()}');
    }
}
`;
      SystemService.insertToClipboard(result);
      SystemService.notify('Laravel export', item.type() + ' ' + item.name() + ' export statement is copied!');
	});
}

export { dumpTableAsDefinition, dumpTableAsLaravel };
