//!wrt $BSPEC:{"aut":"themirrazz","frn":"IoT96 Client","cpr":"(C) Mirrazz Inc. 2022. GPL3.0","ver":"1.4"}

class IoT96Client extends WApplication {
    constructor() {
        super()
    }
    async main() {
        var session=await initApp();
        var mainwnd=this.createWindow({
            title: "IoT96",
            body: `
            <h1>Welcome to IoT96.</h1>
            <p>better ui coming soon lol</p>
            `,
            center: true,
            taskbar: true,
            initialHeight: 250,
            initialWidth: 500
        },true);
        mainwnd.show();
    }
}

if(!current.boxedEnv.args[1]) {
    return await WApplication.execAsync(
        new IoT96Client(),
        this.boxedEnv.args,
        this
    )
}

async function createBookMark(title,url) {
    while(title.includes("/")) {
        title=title.replace("/","")
    }
    title=title;
    if(!await w96.FS.exists("C:/user/links")) { return }
    if(!await w96.FS.exists(`C:/user/links/${title}.link`)) {
        return w96.FS.writestr(
            `C:/user/links/${title}.link`,
            `[InternetShortcut]\nURL=${url}`
        );
    }
    for(var i=1;i<101;i++) {
        if(!await w96.FS.exists(`C:/user/links/${title} (${i}).link`)) {
            return w96.FS.writestr(
                `C:/user/links/${title} (${i}).link`,
                `[InternetShortcut]\nURL=${url}`
            );
        }
    }
}


try {
    if(current.boxedEnv.args[1]==='-d') {
        w96.sys.iot.sendEvent(
            'cli',
            {
                arg: current.boxedEnv.args[2]
            }
        )
    }
} catch(error) {
    null // no error handling or breaking
}
if(w96.sys.iot) {return}

var notif_container=document.createElement('div');
notif_container.className="iot-notification-center";
notif_container.style.top='0px';
notif_container.style.right='0px';
notif_container.style.height='fit-content';
notif_container.style.width='fit-content';
notif_container.style.display='flex';
notif_container.style.flexDirection='column';
notif_container.style.zIndex=w96.WindowSystem.startZIndex;
notif_container.style.position='fixed';
setInterval(()=>{
    if(document.querySelector('.window-dlg.active')) {
        notif_container.style.zIndex=Number(document.querySelector('.window-dlg.active').style.zIndex)+20;
    }
},100);
document.body.appendChild(notif_container);


w96.sys.iot={
    createNotification: async function (title,message,icon,timeout) {
        title=String(title||"Notification")||"Notification";
        var iconURL=await w96.ui.Theme.getIconUrl(icon);
        var notification=document.createElement('div');
        notification.className='iot-notification';
        notification.style.backgroundColor='white';
        notification.style.display="flex";
        notification.style.flexDirection="row";
        notification.style.minWidth="100px";
        notification.innerHTML=`
        <img class='iot-notification-icon' style="height:80px" />
        <div style='flex-shrink:none;'>
        <p class='iot-notification-title'><b></b></p>
        <p class='iot-notification-message'></p>
        </div>
        `;
        notification.querySelector('img').src=iconURL;
        notification.querySelector('.iot-notification-title b').textContent=title;
        notification.querySelector('.iot-notification-message').textContent=message;
        notif_container.appendChild(notification);
        setTimeout(()=>{
            notification.parentNode.removeChild(notification);
        },timeout||5000);
    }
}

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

function setQuery(type,data,user,token) {
    var xhr=new XMLHttpRequest();
    xhr.open('POST','https://api.iot96.repl.co/push-event');
    xhr.send(JSON.stringify({
        username:user,
        token:token,
        eventid:type,
        query:data
    }));
}

setTimeout(async function() {
    var session=await initApp();
    w96.sys.iot.sendEvent=function(type,event) {
        pushEvent(
            type,event,session.user,session.token
        );
    }
    w96.sys.iot.setQuery=function(type,event) {
        setQuery(
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
                        } else if(action.event==='notification') {
                            w96.sys.iot.createNotification(
                                action.fields.title,
                                action.fields.message,
                                action.fields.icon
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
        w96.sys.iot.setQuery(
            'battery_level',
            [{battery_level:battery.level*100}]
        );
        battery.onlevelchange=()=>{
            w96.sys.iot.setQuery(
                'battery_level',
                [{battery_level:battery.level*100}]
            );
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
