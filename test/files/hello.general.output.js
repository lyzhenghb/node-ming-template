function hello_World() {
  {
    var a = 1;
    var b = 2;
  }
  console.log('Hello, World, ' + function () {
    var a = 1;
    var b = 2;
  }() + '.');
  console.log('lalala...');
  console.log('console.log(\'lalala...\');');
  console.log(function fun() {
  }());
}
