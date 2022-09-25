# bpmn-editor
A javascript module that edits the BPMN on the browser.
Bpmn Editor是一个可以在线查看和编辑[BPMN 2.0](https://www.omg.org/spec/BPMN/2.0/PDF "BPMN 2.0")流程图的Javascript库。它可以很方便的嵌入到流程相关的应用中
使得您的客户可以根据自己的需要设计工作流程。

![流程图](https://assets.honqun.cn/assets/process.jpg?x-oss-process=image/resize,w_830,m_lfit)

# 安装
```shell script
npm install bpmn-jseditor
```
或者
```html
<script src="dist/bpmn-jseditor.min.js"></script>
```

# 开始使用
## 容器
首先需要一个容器来装载Editor
```html
<div id="container">

</div>
```
## 初始化
然后就可以初始化BpmnEditor了
```javascript
import BpmnEditor from "bpmn-jseditor";
let editor = new BpmnEditor('#container', {
    name: 'My Process', //流程名称
    key: 'Process-1' //流程Key/ID
})
```
## 加载BPMN XML
加载一个符合 [BPMN 2.0](https://www.omg.org/spec/BPMN/2.0/PDF "BPMN 2.0") 规范的XML文件。
```javascript
editor.xml('Your XML content')
.then(resp => {
   //加载成功
}).catch(resp => {
    //加载失败
})
```

## 获取XML
将编辑的流程转换为 [BPMN 2.0](https://www.omg.org/spec/BPMN/2.0/PDF "BPMN 2.0") XML
```javascript
editor.xml()
.then(resp => {
   console.log(resp.xml)
})
.catch(resp => {
})
```
## 编辑流程图
设置编辑器的Operation即可进入相应的编辑状态。
### 新增节点
调用serOpertion方法之后，点击编辑器即可添加相应的的节点
```javascript
editor.setOperation(BpmnEditor.operations.ADD_USERTASK) //进入新增UserTask状态
```
目前支持的Operation包括：

    - NONE: 无操作
    - ADD_USERTASK: 添加用户任务 
    - ADD_EXCLUSIVE_GATEWAY: 添加互斥网关
    - ADD_STARTEVENT: 添加开始事件
    - ADD_ENDEVENT: 添加结束事件
    - ADD_TIMEREVENT: 添加边界计时事件
    - ADD_SUBPROCESS: 添加子流程
    - PREPARE_DRAW_CONNECTION: 准备绘制连接线
    - REMOVE: 删除选择的节点
    
### 绘制连接线
设置操作状态为PREPARE_DRAW_CONNECTION之后，依次点击起点节点、终点节点即可绘制连接线
```javascript
editor.setOperation(BpmnEditor.operations.PREPARE_DRAW_CONNECTION) //进入绘制连接线状态
```
### 删除节点
鼠标点击节点或者框选多个节点，按下Delete按键即可。也可以调用Api：
```javascript
let selections = editor._getSelections()
for (let i = 0; i < selections.length; i++) {
    editor.remove(selections[i])
}
```

# 事件
可以在初始化的时候声明一个回调函数，以处理节点点击事件：
```javascript
let editor = new BpmnEditor('#container', {
    name: 'My Process', //流程名称
    key: 'Process-1', //流程Key/ID
    elementClick: function(element) {
       let nodeData = element.json()
       //do something, eg. show data in a form
       element.update(nodeData)
    }
})
```
elementClick方法的参数是点击的节点，如果没有点击任何节点则为流程图本身。调用element.json()方法
可以获取此节点符合[activiti 7.0](https://github.com/Activiti/Activiti/ "Activiti 7")格式的JSON对象。
可以修改此JSON对象，并调用update方法更新节点属性。

# TODO List
- 支持流程嵌套
- 支持更多的节点类型，例如：Service Task
- 更多的事件以满足复杂的要求
