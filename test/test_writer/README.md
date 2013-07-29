### ab benchmark
    ab -c 10 -n 1000 -p ./data.txt  'http://localhost:9090/repl/example/INSERT'
    test data in data.txt
### test result
    Server Software:
    Server Hostname:        localhost
    Server Port:            9090
    
    Document Path:          /repl/example/INSERT
    Document Length:        0 bytes
    
    Concurrency Level:      10
    Time taken for tests:   0.861 seconds
    Complete requests:      1000
    Failed requests:        0
    Write errors:           0
    Total transferred:      70000 bytes
    Total POSTed:           689000
    HTML transferred:       0 bytes
    Requests per second:    1161.37 [#/sec] (mean)
    Time per request:       8.611 [ms] (mean)
    Time per request:       0.861 [ms] (mean, across all concurrent requests)
    Transfer rate:          79.39 [Kbytes/sec] received
                            781.43 kb/s sent
                            860.82 kb/s total
    
    Connection Times (ms)
                  min  mean[+/-sd] median   max
    Connect:        0    0   0.3      0       4
    Processing:     2    8   3.9      8      44
    Waiting:        0    7   4.0      7      43
    Total:          4    9   3.9      8      44
    
    Percentage of the requests served within a certain time (ms)
      50%      8
      66%      8
      75%      8
      80%      8
      90%      9
      95%     15
      98%     18
      99%     41
     100%     44 (longest request)

