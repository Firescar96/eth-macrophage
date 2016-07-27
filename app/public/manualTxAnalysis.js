interestingTx = analysis.txHashMessages['da3c75196b9f9f493418b37d1f8440283b6493b388ce8f9c553115c2dd6ed6aa90e49091a786cef70502349d9cfb6b0b8393acda511453ba658cfeabeba8819b']['0x6568ff425e8bc60cb551e0adde9f7e83c12165c27c26ee390324cc578bd2b7fa'];

interestingTx.filter((m) => m.from.localeCompare('b9aca83f457c057fc0b44639c00c648c76565d702ba6299793c5e4cef069b68dd06249079aa43f04d441c7501040e0ac2ce5ab1361e67ba064537594377314a0')==0)

String.prototype.rpad = function(padString, length) {
	 var str = this;
    while (str.length < length)
        str = str + padString;
    return str;
}

point = interestingTx.map((message) => {
  let milliSeconds = Date.parse(message.time).toString()
  console.log(milliSeconds, milliSeconds.substr(5, milliSeconds.length - 8));
  let nanoSeconds = milliSeconds
  .substr(7, milliSeconds.length - 10) +
  message.time.match(/\d*/g)[12].rpad("0",9);
  return parseInt(nanoSeconds);
});

baselineX = Math.min(...point.filter((p) => p)) - 1;

point.map((t) => (t / baselineX) % 1 * Math.pow(10, 12));

point.map((t) => {
  console.log(Math.exp(Math.log(t) - Math.log(baselineX)) % 1 * Math.pow(10, 11));
  return Math.exp(Math.log(t) - Math.log(baselineX)) % 1 * Math.pow(10, 11);
});