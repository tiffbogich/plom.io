function Person(gender) {
    this.gender = gender;
    this.a = 12;
}

Person.prototype.hi = function(){
    console.log('hi');
};


function Student(gender, age) {
    Person.call(this, gender);
//    this.a = 13;
    this.age = age;
}

var F = function(){};
F.prototype = Person;

Student.prototype = new F(); // make Student inherit from a Person object
Student.prototype.constructor = Student; // fix constructor property


console.log(Student.prototype);
//Student.prototype = Object.create(Person.prototype);
//Student.prototype.constructor = Student;


Student.prototype.hi = function(){
    console.log('bye');
};


Student.prototype.original = function(){
    Person.prototype.hi.call(this);
};



var foo = new Student('male', 23);
console.log(foo.prototype);
console.log(foo.a);             // "male"
console.log(foo.gender);             // "male"
console.log(foo.age);             // "male"
foo.hi();
console.log(foo instanceof Student); // true
console.log(foo instanceof Person);  // true



console.log('yooo');
foo.original();
foo.hi();
foo.original();
foo.hi();

//console.log('closure');
//
//[1,100].forEach(function(d,i){
//
//    var x = d;
//
//    y();
//
//    function y(){
//        setInterval(function(){
//            x++;
//            console.log(x);} , 100);
//    }
//
//
//
//})
