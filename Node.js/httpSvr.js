var tls = require('tls');
var net = require('net');
var local_port = 9094;

//支持https端口443 或者普通端口
var proxyPort = 8787;
var proxyAddr = "localhost";

//在本地创建一个server监听本地local_port端口
net.createServer(function (client)
{
    
    //首先监听浏览器的数据发送事件，直到收到的数据包含完整的http请求头
    var buffer = new Buffer(0);
    client.on('data',function(data)
    {
        buffer = buffer_add(buffer,data);
        if (buffer_find_body(buffer) == -1) return;
        var req = parse_request(buffer);
        if (req === false) return;
        client.removeAllListeners('data');
        relay_connection(req);
    });

    //从http请求头部取得请求信息后，继续监听浏览器发送数据，同时连接目标服务器，并把目标服务器的数据传给浏览器
    function relay_connection(req)
    {
        console.log(req.method+' '+req.host+':'+req.port);
   
        
        //建立到代理服务器的连接
		var server = null;
		var callback = function(server){
			//交换服务器与浏览器的数据
			
			client.on("data", function(data){ server.write(data); });
			client.on("error", function(err){ console.log("a1");console.log(err); client.removeAllListeners("data");});
			client.on("end", function(err){console.log("a1--"); client.removeAllListeners("data"); });
			  
			server.on("data", function(data){ client.write(data); });
			server.on("error", function(err){ console.log("a2");console.log(err); server.removeAllListeners("data");});
			server.on("end", function(err){ console.log("a2--");server.removeAllListeners("data");  });

			server.write(buffer);	
		 };
		 
		if(proxyPort == 443){
		    server = tls.connect(proxyPort,proxyAddr, function(){
			   callback(server)();
			});
		}
		else {
		    server = net.connect(proxyPort,proxyAddr, function(){
			   callback(server)();
			});
		}
		
		
    }
}).listen(local_port);

console.log('Proxy server running at localhost:'+local_port);


//处理各种错误
process.on('uncaughtException', function(err)
{
    console.log("\nError!!!!");
    console.log(err);
});


function bufferToStr(buffer){
return buffer.toString('utf8');
}

/**
* 从请求头部取得请求详细信息
* 如果是 CONNECT 方法，那么会返回 { method,host,port,httpVersion}
* 如果是 GET/POST 方法，那么返回 { metod,host,port,path,httpVersion}
*/
function parse_request(buffer)
{
    var s = buffer.toString('utf8');
    var method = s.split('\n')[0].match(/^([A-Z]+)\s/)[1];
    if (method == 'CONNECT')
    {
        var arr = s.match(/^([A-Z]+)\s([^\:\s]+)\:(\d+)\sHTTP\/(\d\.\d)/);
        if (arr && arr[1] && arr[2] && arr[3] && arr[4])
            return { method: arr[1], host:arr[2], port:arr[3],httpVersion:arr[4] };
    }
    else
    {
        var arr = s.match(/^([A-Z]+)\s([^\s]+)\sHTTP\/(\d\.\d)/);
        if (arr && arr[1] && arr[2] && arr[3])
        {
            var host = s.match(/Host\:\s+([^\n\s\r]+)/)[1];
            if (host)
            {
                var _p = host.split(':',2);
                return { method: arr[1], host:_p[0], port:_p[1]?_p[1]:80, path: arr[2],httpVersion:arr[3] };
            }
        }
    }
    return false;
}




/**
* 两个buffer对象加起来
*/
function buffer_add(buf1,buf2)
{
    var re = new Buffer(buf1.length + buf2.length);
    buf1.copy(re);
    buf2.copy(re,buf1.length);
    return re;
}

/**
* 从缓存中找到头部结束标记("\r\n\r\n")的位置
*/
function buffer_find_body(b)
{
    for(var i=0,len=b.length-3;i<len;i++)
    {
        if (b[i] == 0x0d && b[i+1] == 0x0a && b[i+2] == 0x0d && b[i+3] == 0x0a)
        {
            return i+4;
        }
    }
    return -1;
}