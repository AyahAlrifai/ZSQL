var query=` SELECT *
FROM KHA_Parent
JOIN KHA_Card ON (KHA_Parent.Card_Id = KHA_Card.Card_Id)
JOIN ADM_StudentLink ON (KHA_Parent.StudentLink_Id=ADM_StudentLink.StudentLink_Id)
JOIN COMM_Person ON (ADM_StudentLink.LinkPerson_Id=COMM_Person.Person_Id)
LEFT OUTER   JOIN COMM_OtherId AS FAMILYBOOK ON (COMM_Person.OtherIdList_Id=FAMILYBOOK.OtherIdList_Id AND FAMILYBOOK.OtherIdType = 1)
LEFT OUTER   JOIN COMM_OtherId AS PASSPORTNUMBER ON ((COMM_Person.OtherIdList_Id=PASSPORTNUMBER.OtherIdList_Id) AND (PASSPORTNUMBER.OtherIdType = 2))
LEFT OUTER   JOIN COMM_OtherId AS RESIDENCYNUMBER ON ((COMM_Person.OtherIdList_Id=RESIDENCYNUMBER.OtherIdList_Id) AND (RESIDENCYNUMBER.OtherIdType = 3))
LEFT OUTER   JOIN COMM_Phone ON ((COMM_Person.PhoneList_Id=COMM_Phone.PhoneList_Id) AND (COMM_Phone.ContactType = 1))
WHERE COMM_Person.User_Id = 521816;`;
var selector="";
var where="";
var joins=new Array();
var tables=new Array();
var aliasArray={};
var java="";
var logic = new RegExp(/[\s\)]*(OR|AND)[\s\(]/i);
var math =new RegExp(/(=|!=|<>|[\s\)]IN|NOT|NOT\s*IN|>=|<=|>|<|IS\s*NULL|IS\s*NOT\s*NULL|LIKE)/i);
window.addEventListener('load',()=>{
document.getElementById('input').addEventListener('input',()=>{
selector="";
where="";
joins=new Array();
aliasArray={};
java="";
query=document.getElementById('input').value;
query=query.replace(/\s+/g," ");
query=query.replace(/;/g,"");
query=query.replace(/[\s\n]+FROM\s+/ig,'\nFROM ').replace(/\s*JOIN\s*/ig,'\nJOIN ').replace(/\S*INNER\s*JOIN\s*/ig,'\nJOIN ').replace(/ \s*LEFT\s*OUTER\s*JOIN\s*/ig,'\nLEFT ').replace(/\s*RIGHT\s*OUTER\s*JOIN\s*/ig,'\nRIGHT ').replace(/\s*WHERE\s*/ig,'\nWHERE ').replace(/\s*RIGHT\s*JOIN\s*/ig,'\nRIGHT ').replace(/\s*LEFT\s*JOIN\s*/ig,'\nLEFT ').replace(/'/ig,'"');
query=query.split('\n');
console.log(query);
for(var i in query) {
  if(matchFrom(query[i])!=-1) {
    selector=query[i].substr(5).trim();
    var asIndex=selector.search(/\s+AS\s+/i)
    if(asIndex!=-1) {
	  table=selector.split(/AS/i);
      alias=table[1].replace(/\s*/ig,"");
	  selector=table[0].replace(/\s*/ig,"");
      aliasArray[alias]=selector;
	  selector=alias;
    } else {
	console.log(selector);
      tables.push(selector.replace(/\s/ig,""));
      selector=`M_${selector}.selector`;
    }
  } else if(matchJoin(query[i])!=-1) {
    joins[joins.length]=splitJoin(query[i].substr(5),"INNER");
  } else if(matchLeftJoin(query[i])!=-1) {
    joins[joins.length]=splitJoin(query[i].substr(5),"LEFT");
  } else if(matchRightJoin(query[i])!=-1) {
    joins[joins.length]=splitJoin(query[i].substr(6),"RIGHT");
  } else if(matchWhere(query[i])!=-1) {
    where=query[i].substr(6).trim();
    where=getConditionObj(where);
  }
}
for(var key in aliasArray) {
  java+=`Selector ${key}=new Selector(M_${aliasArray[key]}.selector,"${key}");\n`;
}
java+=`Query query=new Query(${selector.replace(/\s*/ig,"")}`;
if(where.length>0) {
  java+=`,\n\t${getJavaCondition(getOrArray(where))},`;
}
for(var i=0;i<joins.length;i++) {
  java+=getJavaJoin(joins[i]);
}
if(java[java.length-1]==",") {
  java=java.substr(0,java.length-1);
}
java+=");";
document.getElementById('output').value=java;
});

document.getElementById('copy').addEventListener('click',()=>{
var input = document.createElement("textarea");
input.value=java;
document.body.appendChild(input);
input.select();
document.execCommand("copy");
document.body.removeChild(input);
document.getElementById("alert").innerHTML=`
  <div class="alert alert-success alert-dismissible fade show">
    <button type="button" class="close" data-dismiss="alert">&times;</button>
    <strong>Success!</strong> This alert box could indicate a successful or positive action.
  </div>`;
window.setTimeout(()=>{
  document.getElementById("alert").innerHTML="";
},3000);
});
});

const getJavaCondition=(condition)=>{
if(condition.length==0) return "";
var cond="";
if(condition[1].search(/\s*AND\s*/i)!=-1) {
cond+=`Sql.and(`;
  for(var i=0;i<condition.length;i+=2) {
    cond+=getJavaCondition(condition[i])+",";
  }
  if(cond[cond.length-1]==",") {
    cond=cond.substr(0,cond.length-1);
  }
  cond+=")";
} else if(condition[1].search(/\s*OR\s*/i)!=-1) {
  cond+=`Sql.or(`;
    for(var i=0;i<condition.length;i+=2) {
      cond+=getJavaCondition(condition[i])+",";
    }
    if(cond[cond.length-1]==",") {
      cond=cond.substr(0,cond.length-1);
    }
    cond+=")";
  } else {
    var cond1=condition[0].split(".");
    var cond2=condition[2].split(".");
    var table1=cond1[0].replace(/\s/ig,"");
    var column1=cond1.length>1?cond1[1].replace(/\s/ig,""):"";
    var table2=cond2[0].replace(/\s/ig,"");
    var column2=cond2.length>1?cond2[1].replace(/\s/ig,""):"";
    var v1=condition[0],v2=condition[2];
    if(aliasArray.hasOwnProperty(table1)) {
      var x=`M_${aliasArray[table1]}.col_${column1}`;
      v1=`Sql.alias("${table1}",${x})`;
    } else if(tables.includes(table1.replace(/\s/ig,""))) {
      v1=`M_${table1}.col_${column1}`;
    }

    if(aliasArray.hasOwnProperty(table2)) {
      var x=`M_${aliasArray[table2]}.col_${column2}`;
      v2=`Sql.alias("${table2}",${x})`;
    } else if(tables.includes(table2.replace(/\s/ig,""))) {
      v2=`M_${table2}.col_${column2}`;
    }
    if(condition[1].search(/\s*!=\s*/i)!=-1) {
      cond+= `Sql.ne(${v1},${v2})`;
    } else if(condition[1].search(/\s*<>\s*/i)!=-1) {
      cond+= `Sql.ne(${v1},${v2})`;
    } else if(condition[1].search(/\s*IN\s*/i)!=-1) {
      cond+= `Sql.in(${v1},${v2})`;
    } else if(condition[1].search(/\s*NOT\sIN\s*/i)!=-1) {
      cond+= `Sql.notIn(${v1},${v2})`;
    } else if(condition[1].search(/\s*>=\s*/i)!=-1) {
      cond+= `Sql.ge(${v1},${v2})`;
    }  else if(condition[1].search(/\s*<=\s*/i)!=-1) {
      cond+= `Sql.le(${v1},${v2})`;
    } else if(condition[1].search(/\s*<\s*/i)!=-1) {
      cond+= `Sql.lt(${v1},${v2})`;
    } else if(condition[1].search(/\s*>\s*/i)!=-1) {
      cond+= `Sql.gt(${v1},${v2})`;
    } else if(condition[1].search(/\s*IS\sNull\s*/i)!=-1) {
      cond+= `Sql.isNull(${v1})`;
    } else if(condition[1].search(/\s*IS\sNot\sNull\s*/i)!=-1) {
      cond+= `Sql.isNotNull(${v1})`;
    } else if(condition[1].search(/\s*LIKE\s*/i)!=-1) {
      cond+= `Sql.like(${v1},${v2})`;
    } else if(condition[1].search(/\s*NOT\s*/i)!=-1) {
      cond+= "not ";
    } else if(condition[1].search(/\s*=\s*/i)!=-1) {
      cond+= `Sql.eq(${v1},${v2})`;
    } 
  }
  return cond;
}

const getOrArray=(condition)=>{
  var orArray=[];
  var current=0;
  // if(condition.length==1)
  //   condition=condition[0];
  for(var i=1;i<condition.length;i+=2) {
    if(condition[i].search(/[\s\)]AND[\s\(]/i)!=-1) {
      if(orArray[current]==undefined) {
        orArray.push(new Array(condition[i-1],"AND",condition[i+1]))
      } else {
        orArray[current].push("AND",condition[i+1]);
      }
    } else if(condition[i].search(/[\s\)]OR[\s\(]/i)!=-1) {
      if(orArray[current]==undefined) {
        orArray.push(new Array(condition[i-1]))
        current+=1;
        orArray[current]="OR";
        current+=1;
      } else {
        orArray[current]="OR";
        current+=1;
        orArray.push(new Array(condition[i+1]))
      }
    } else {
      orArray=condition;
      break;
    }
  }
  return orArray;
}

const getJavaJoin=(join)=>{
  aliasSelector="";
  var condition=join.condition;
  condition=getJavaCondition(condition);
  var table1=join.alias==""?"M_"+join.table+".selector":join.alias;
  var table2;
  while(true) {
    if(Array.isArray(join.condition)) {
      join.condition=join.condition[0];
    } else {
      table2=join.condition.split(".")[0].replace(/\s/ig,"");
      break;
    }
  }

  if(!aliasArray.hasOwnProperty(table2)) {
    table2=`M_${table2}.selector`;
  }
  return `\n\tJoin.${join.type=="INNER"?"inner":join.type=="LEFT"?"leftOuter":"rightOuter"}(\n\t\t${table2},\n\t\t${condition},\n\t\t${table1}),`
}

const matchFrom=(query)=>{
  return query.search(/^\s*FROM\s+/ig);
}

const matchJoin=(query)=>{
  return query.search(/\s*JOIN\s+/ig);
}

const matchLeftJoin=(query)=>{
  return query.search(/\s*LEFT\s+/ig);
}

const matchRightJoin=(query)=>{
  return query.search(/\s*RIGHT\s+/ig);
}

const matchWhere=(query)=>{
  return query.search(/\s*WHERE\s+/ig);
}

const splitJoin=(query,type)=>{
  script=query.split(/\s+ON\s+/ig);
  var alias="";
  var asIndex=script[0].search(/\s+AS\s+/i)
  if(asIndex!=-1) {
    alias=script[0].substr(asIndex+4);
    script[0]=script[0].substr(0,asIndex);
    aliasArray[alias]=script[0];
  }
  tables.push(script[0].trim());
  var condition=getOrArray(getConditionObj(script[1].trim()));
  return {
    type:type.trim(),
    table:script[0].trim(),
    condition:condition,
    alias:alias.trim()
  }
}

const getConditionObj=(condition)=>{
  var count=0;
  var obj=[];
  var index=0;
  while(condition!="" && condition!=null) {
    condition=condition.trim();
    if(condition.search(math)==-1) {
      return condition;
    }
    if(allInParentheses(condition)) {
      obj.push(getConditionObj(condition.substr(1,condition.length-2)));
      condition="";
    } else if(condition[0]=="(") {
      var closed=getClosed(condition);
      obj.push(getConditionObj(condition.substr(1,closed-1).trim()));
      condition=condition.substr(closed+1).trim();
      if(condition=="") return obj
      var code=condition.match(logic);
      if(code==null) {
        code=condition.match(math);
      }
      obj.push(code[0]);
      condition=condition.substr(code[0].length);
    } else {
      var code=condition.match(logic);
      var opIndex = condition.search(logic);
      if(opIndex==-1) {
        code=condition.match(math);
        opIndex = condition.search(math);
        obj.push(condition.substr(0,opIndex).trim());
        obj.push(code[0].trim());
        obj.push(condition.substr(opIndex+code[0].length).trim());
        return obj.length==1?obj[0]:obj;
      } else {
        obj.push(getConditionObj(condition.substr(0,opIndex).trim()));
        obj.push(code[0].trim());
        condition=condition.substr(opIndex+code[0].length).trim();
        code=condition.match(logic);
        opIndex = condition.search(logic);
        if(opIndex==-1) {
          obj.push(getConditionObj(condition));
          return obj.length==1?obj[0]:obj;
        }
      }
    }
  }
  return obj.length==1?obj[0]:obj;
}

const getClosed=(condition)=>{
  var open=0;
  var close=0
  var i=0;
  var arr=condition.split("");
  for(i=0;i<arr.length;i++) {
    if(arr[i]=="(") open+=1;
    else if(arr[i]==")") close+=1;
    if(open==close && open!=0 && close !=0) {
      return i;
    }
  }
  return -1;
}

const allInParentheses=(condition)=>{
  var open=0;
  var close=0
  var i=0;
  var arr=condition.split("");
  for(i=0;i<arr.length;i++) {
    if(arr[i]=="(") open+=1;
    else if(arr[i]==")") close+=1;
    if(open==close && i!=(arr.length-1)) {
      return false;
    }
  }
  if(open==close && i==arr.length) {
    return true;
  }
  return false;
}
