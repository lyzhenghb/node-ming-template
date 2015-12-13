//
// @ming NAME some body's name
// @ming STATEMENT some statements
// @ming declarations variable declarartions
// @ming funcdecl function declaration
//
function hello_$NAME$() {
  $declarations$;
  console.log('Hello, $NAME$, ' + $declarations$ + '.');
  $STATEMENT$;
  console.log($STATEMENT$);
  console.log($funcdecl$());
}
