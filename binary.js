//!wrt $BSPEC:{"aut":"themirrazz","frn":"IoT96 Client","cpr":"(C) Mirrazz Inc. 2022. GPL3.0"}

try {
    if(current.boxedEnv.args[1]) {
        w96.sys.iot.sendEvent(
            'cli',
            {
                arg: current.boxedEnv.args[1]
            }
        )
    }
} catch(error) {
    null // no error handling or breaking
}
if(w96.sys.iot) {return}

w96.sys.iot={}

function pushEvent(type,data,user,token) {
    var xhr=new XMLHttpRequest();
    xhr.open('POST','https://api.iot96.repl.co/push-event');
    xhr.send(JSON.stringify({
        username:user,
        token:token,
        eventid:type,
        event:data
    }));
}

setTimeout(async function() {
    var session=await initApp();
    w96.sys.iot.sendEvent=function(type,event) {
        pushEvent(
            type,event,session.user,session.token
        );
    }
    var logPush=w96.sys.log.events.push;
    w96.sys.log.events.push=function(...args) {
        logPush.apply(w96.sys.log,...args);
        args.forEach(arg=>{
            w96.sys.iot.sendEvent(
                'new_slog_entry',
                {
                    message:arg.message,
                    severity:arg.severity,
                    source:arg.source
                }
            )
        })        
    }
    setInterval(()=>{
        var x=new XMLHttpRequest();
        x.onreadystatechange=()=>{
            if(x.readyState==4){
                try {
                    var d=JSON.parse(x.responseText);
                    d.forEach(action=>{
                        if(action.event==='alert') {
                            alert(
                                action.fields.message_content,
                                {
                                    icon: action.fields.dialog_type==="critical"?'error':(
                                        action.fields.dialog_type==="warning"?'warning':(
                                            action.fields.dialog_type==="info"?'info':(
                                                'question'
                                            )
                                        )
                                    )
                                }
                            )
                        } else if(action.event==='internete') {
                            w96.sys.execCmd(
                                'internete',
                                [action.fields.page_url]
                            )
                        } else if(action.event==='systemlog') {
                            logPush.apply(w96.sys.log,
                                {
                                    severity:action.fields.severity_level,
                                    message:action.fields.message,
                                    date: (new Date).toString(),
                                    source: 'IFTTT'
                                }
                            )
                        }
                    })
                } catch (error) {
                    0
                }
            }
        }
        x.open('POST','https://api.iot96.repl.co/read-queue');
        x.send(JSON.stringify({
            username:session.user,
            token:session.token
        }))
    },1000)
    w96.sys.iot.name=session.name;
    var bsod=w96.sys.renderBSOD
    w96.sys.renderBSOD=function(message) {
        w96.sys.iot.sendEvent('bsod',{
            message:message
        });
        bsod(message)
    }
    if(navigator.getBattery) {
        var battery=await navigator.getBattery();
        battery.onchargingchange=()=>{
            w96.sys.iot.sendEvent(
                'battery_charging_change',
                {
                    is_charging: battery.charging?'charging':'not charing',                    created_at: Date.now()
                }
            )
        }
    }
},3000);

function initApp() {
    return new Promise(async (y,n)=>{
        if(!await w96.FS.exists("C:/user/appdata/IoT96")) {
            await w96.FS.mkdir("C:/user/appdata/IoT96")
        }
        try {
            if(!await w96.FS.exists("C:/user/appdata/IoT96/session")) {
                throw new Error('uh oh!')
            }
            y(JSON.parse(
                await w96.FS.readstr("C:/user/appdata/IoT96/session")
            ))
        } catch (error) {
            var sw=new w96.StandardWindow({
                title: "Please, sign in, I beg you",
                taskbar: true,
                center: true,
                initialHeight: 500,
                initialWidth: 500,
                body:`Username <input class="iot-user" /><br>
                Password <input class='iot-pass' type='password' /><br>                <button class='iot-button'>ok</button>
                <br>
                <span style='color:red' class='iot-nope'></span>`
            });
            sw.show();
            var user=sw.wndObject.querySelector('.iot-user');
            var pasw=sw.wndObject.querySelector('.iot-pass');
            var name=sw.wndObject.querySelector('.iot-name');
            var nope=sw.wndObject.querySelector('.iot-nope');
            sw.wndObject.querySelector('.iot-button').onclick=async()=>{
                var xhr=new XMLHttpRequest();
                xhr.onreadystatechange=async()=>{
                    if(xhr.readyState==4) {
                        try {
                            if(JSON.parse(xhr.responseText).error) {
                                throw JSON.parse(xhr.responseText).error
                            }
                            await w96.FS.writestr('C:/user/appdata/IoT96/session',JSON.stringify({
                                token: JSON.parse(xhr.responseText).token,
                                user:user.value,
                            }));
                            sw.onclose=()=>{};
                            sw.close();
                            y({
                                token:JSON.parse(xhr.responseText).token,
                                user:user.value,                            });
                        } catch (err) {
                            nope.innerText="Nope! "+err
                        }
                    }
                }
                xhr.onerror=()=>{
                    nope.innerText="Nope!"
                };
                xhr.open('POST','https://api.iot96.repl.co/login');
                xhr.send(JSON.stringify({
                    username:user.value,
                    password:pasw.value
                }));
            }
            sw.onclose=()=>{n()}
        }
    });
}
