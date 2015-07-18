var tls = require('tls');
var net = require('net');
var local_port = 9094;

var proxyPort = 443;
var proxyAddr = "yourproxyserver";

//�ڱ��ش���һ��server��������local_port�˿�
net.createServer(function (client)
{
    
    //���ȼ�������������ݷ����¼���ֱ���յ������ݰ���������http����ͷ
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

    //��http����ͷ��ȡ��������Ϣ�󣬼�������������������ݣ�ͬʱ����Ŀ�������������Ŀ������������ݴ��������
    function relay_connection(req)
    {
        console.log(req.method+' '+req.host+':'+req.port);
   
        
        //����������������������
		 var server = tls.connect(proxyPort,proxyAddr,function( ){
		     
        //�����������������������
        client.on("data", function(data){ server.write(data); });
		  client.on("error", function(err){ console.log("a1");console.log(err); client.removeAllListeners("data");});
		  client.on("end", function(err){console.log("a1--"); client.removeAllListeners("data"); });
		  
        server.on("data", function(data){ client.write(data); });
		 server.on("error", function(err){ console.log("a2");console.log(err); server.removeAllListeners("data");});
		  server.on("end", function(err){ console.log("a2--");server.removeAllListeners("data");  });

			 server.write(buffer);			 
		 });
		
    }
}).listen(local_port);

console.log('Proxy server running at localhost:'+local_port);


//�������ִ���
process.on('uncaughtException', function(err)
{
    console.log("\nError!!!!");
    console.log(err);
});


function bufferToStr(buffer){
return buffer.toString('utf8');
}

/**
* ������ͷ��ȡ��������ϸ��Ϣ
* ����� CONNECT ��������ô�᷵�� { method,host,port,httpVersion}
* ����� GET/POST ��������ô���� { metod,host,port,path,httpVersion}
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
* ����buffer���������
*/
function buffer_add(buf1,buf2)
{
    var re = new Buffer(buf1.length + buf2.length);
    buf1.copy(re);
    buf2.copy(re,buf1.length);
    return re;
}

/**
* �ӻ������ҵ�ͷ���������("\r\n\r\n")��λ��
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