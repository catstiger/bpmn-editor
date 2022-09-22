import _ from "underscore"

class Elements {
    size = 0;
    first = null;
    last = null

    /**
     * 添加一个Element
     * @param element
     */
    add(element) {
        this._linkLast(element)
    }

    remove(element) {
        this._unlink(element)
    }

    contains(element) {
        let contains = false
        this.each(function(e) {
            if (e.id === element.id) {
                contains = true
            }
        })
        return contains;
    }

    moveLast(x) {
        if (!this.contains(x)) {
            return;
        }
        const next = x.next;
        const prev = x.prev;

        if (prev === null) {
            this.first = next;
        } else {
            prev.next = next;
            x.prev = null;
        }

        if (next === null) {
            this.last = prev;
        } else {
            next.prev = prev;
            x.next = null;
        }
        const l = this.last;
        this.last = x;
        if (l == null)
            this.first = x;
        else {
            l.next = x;
            x.prev = l
        }
    }

    _unlink(x) {
        if (!this.contains(x)) {
            return;
        }
        const next = x.next;
        const prev = x.prev;

        if (prev === null) {
            this.first = next;
        } else {
            prev.next = next;
            x.prev = null;
        }

        if (next === null) {
            this.last = prev;
        } else {
            next.prev = prev;
            x.next = null;
        }

        x = null
        this.size--;
    }

    _linkLast(element) {
        const l = this.last;
        this.last = element;
        if (l == null)
            this.first = element;
        else {
            l.next = element;
            element.prev = l
        }

        this.size++;
    }

    /**
     * 遍历所有节点
     * @param fn
     */
    each(fn) {
        let index = 0
        for (let e = this.first; e != null; e = e.next) {
            index ++
            if (_.isFunction(fn)) {
                let r = fn.call(e, e, index)
                if (r === false) {
                    break;
                }
            }
        }
    }

    /**
     * 反向遍历所有节点
     */
    eachRevert(fn) {
        let index = this.size - 1
        for (let e = this.last; e != null; e = e.prev) {
            index --
            if (_.isFunction(fn)) {
                let r = fn.call(e, e, index)
                if (r === false) {
                    break;
                }
            }
        }
    }

    getSize() {
        return this.size;
    }

    /**
     * 返回第一个Element
     */
    getFirst() {
        return this.first;
    }

    /**
     * 返回最后一个Element
     */
    getLast() {
        return last;
    }
}

export default Elements