Wazproxy is an HTTP proxy written in Node.js that automatically signs requests to Windows Azure blob storage for a given account. This is useful for developers who want to try out the Windows Azure REST API without having to deal with authentication. By running wazproxy and proxying web requests through it, you can use simple tools like `curl` or even a web browser to interact with Windows Azure storage.

Wazproxy is also useful for adapting existing apps to work with Windows Azure storage. For example, if you have an application that can consume a
generic OData feed but doesn't support Windows Azure storage authentication, you can start wazproxy, change your proxy settings, and use the application as-is.

Installation
------------

`npm install wazproxy -g`

Usage
-----

    Usage: wazproxy.js [options]
    
      Options:
    
        -h, --help               output usage information
        -V, --version            output the version number
        -a, --account [account]  storage account name
        -k, --key [key]          storage account key
        -p, --port [port]        port (defaults to 8080)

Examples
--------

The following will list all the tables in the given account:

    wazproxy -a <account> -k <key>
    set http_proxy=127.0.0.1:8080
    curl <account>.table.core.windows.net/tables

On Linux or OS X, use `export` instead of `set`.

The following will create a container (private, by default), upload a text blob into it, retrieve the blob, and finally delete the container.

    curl <account>.blob.core.windows.net/testcontainer?restype=container -X PUT -d ""
    curl <account>.blob.core.windows.net/testcontainer/testblob -X PUT -d "hello world" -H "content-type:text/plain" -H "x-ms-blob-type:BlockBlob"
    curl <account>.blob.core.windows.net/testcontainer/testblob
    # output: "hello world"
    curl <account>.blob.core.windows.net/testcontainer?restype=container -X DELETE

The following will peek at a queue message:

    curl <account>.queue.core.windows.net/myqueue/messages?peekonly=true

For the full details of the Windows Azure storage API, see the ["Windows Azure Storage Services REST API Reference" on MSDN](http://msdn.microsoft.com/en-us/library/windowsazure/dd179355.aspx).

Notes
-----

Wazproxy only proxies HTTP requests (not HTTPS). Any request that's not addressed to `<account>.(blob|table|queue).core.windows.net` is simply passed through unmodified, so you can proxy all traffic through wazproxy (including, for example, traffic from other browser tabs).

Wazproxy does not support the storage emulator, but pull requests are welcome.
