import Stage from "./Stage";
import {OPERATIONS} from "./Constants";
import axios from "axios";

class Editor extends Stage {
    url = 'http://101.42.253.152:9090/workflow/api/json/convert'

    constructor(container, properties) {
        super(container, properties);
        this.url = properties.url ?? this.url
    }

    /**
     * 因为bpmn-editor处理的是JSON数据，因此需要提供JSON和XML互相转换的服务，我们提供了缺省的服务地址，
     * 如果缺省地址不能满足要求，则需要自行提供该服务<br>
     * 设置提供“JSON<=>XML”转换的Web服务地址，服务的要求为：
     * <ul>
     *     <li>支持POST请求</li>
     *     <li>既能够转换XML->JSON; 也能够转换JSON->XML;Activiti提供了这些功能的实现</li>
     *     <li>
     *         加载XML文件：参数格式为
     *         {xml:'XML content'}，响应的数据为{success: true, data:{json:'JSON String'}}
     *     </li>
     *     <li>
     *         获取XML文件：则参数格式为
     *         {json: 'JSON String'}，响应的数据为{success: true, data:{xml:'XML content'}}
     *     </li>
     *
     * </ul>
     * @param url
     * @return {Editor}
     */
    url(url) {
        this.converterURL = url
        return this;
    }

    /**
     * 加载或者获得XML文件,
     * 可以将流程图的JSON数据转换为Bpmn2.0 XML文件，也可以将Bpmn2.0 XML文件转换为
     * 符合activiti要求的JSON数据
     * @param xmlStr
     */
    xml(xmlStr) {
        let me = this;

        if (xmlStr) { //加载XML
            return new Promise((resolve, reject)=>{
                let param = {xml: xmlStr}
                //XML转为JSON
                axios.post(
                    me.url,
                    param
                ).then((resp) => {
                    if (resp.data.success) {
                        me.clear()
                        me.json(JSON.parse(resp.data.data.json))
                        resolve(resp.data)
                    } else {
                        reject(resp)
                    }
                }).catch((resp) => {
                    console.log('An error caught when setting xml')
                    reject(resp)
                })
            });
        } else { //返回XML
            return new Promise((resolve, reject)=>{
                let param = {json: JSON.stringify(me.json())}
                //JSON转换为XML
                axios.post(
                    me.url,
                    param
                ).then((resp) => {
                    if (resp.data.success) {
                        let xml = resp.data.data.xml
                        resolve({
                            success: true,
                            xml: xml
                        })
                    } else {
                        reject(resp)
                    }
                }).catch((resp) => {
                    console.log('An error caught when getting xml')
                    reject(resp)
                })
            });
        }
    }

    /**
     * 导出SVG
     */
    exportSVG() {
        return this.svgDraw.svg()
    }

    static operations = OPERATIONS
}
export default Editor