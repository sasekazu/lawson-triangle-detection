// JavaScript Document
/// <reference path="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js" />
/// <reference path="numeric-1.2.6.min.js" />


// ドロネー三角形分割用の三角形クラス
// 引数 points = [[x1,y1],[x2,y2],[x3,y3]]
// 引数 indices 頂点のインデックス
function DelaunayTriangle(points, indices){
	this.adjacent=[null, null, null];	// 隣接する三角形の参照，辺12, 辺23，辺31において隣接する三角形を順に格納する
	this.edgeIDinAdjacent=[-1,-1,-1];	// adjacentの各要素と対応．adjacent[i]が隣接する辺ID．辺IDはadjacent側のもの．	
	this.vertexID=numeric.clone(indices);
	this.init(points);
	this.prev=null;	// 双方向連結リストの前ポインタ
	this.next=null;	// 双方向連結リストの次ポインタ
}

DelaunayTriangle.prototype.push=function (next) {
	this.next=next;
	next.prev=this;
}

DelaunayTriangle.prototype.init = function(points){
	var v1=numeric.sub(points[1], points[0]);
	var v2=numeric.sub(points[2], points[0]);
	// もし，頂点が時計回りならばpoints[1]とpoints[2]を入れ替える
	// v1 cross v2 のz座標が負であれば時計回り
	var tmp;
	if(v1[0]*v2[1]-v1[1]*v2[0]<0) {
		tmp=this.vertexID[1];
		this.vertexID[1]=this.vertexID[2];
		this.vertexID[2]=tmp;
	}
}


// ドロネー三角形分割関数
// ※非常に効率の悪い実装
// 引数1 inputPoints: 入力点の座標 [[x1,y1],[x2,y2],....]
// 引数2,3,4,5 ymax, ymin, xmax, xmin: 入力点が含まれる領域の最大・最小座標
// 返り値：triangleのコネクティビティ 
// 例: [[0,1,2], [0,1,3], [1,2,4]..] は 
// inputPoints[0], inputPoints[1], inputPoints[2] が三角形を構成する。
// …以下、同様
function DelaunayTriangulation(inputPoints, ymax, ymin, xmax, xmin) {

	var pos = numeric.clone(inputPoints);	// 点の数 x 2(x,y)
	var dPos = [];	// 動的に変わる点
	var tri = [];	// 三角形の数 x 3(三角形頂点の点番号)

	// すべての点を内包する
	// 大きい三角形(superTriangle)の頂点を追加
	// 下の点, 上の点1, 上の点2の順
	dPos.push([(xmax+xmin)*0.5, ymin-(xmax-xmin)*0.5*1.73205080757]);
	dPos.push([(xmax+xmin)*0.5-(xmax-xmin)*0.5-(ymax-ymin)/1.73205080757, ymax]);
	dPos.push([(xmax+xmin)*0.5+(xmax-xmin)*0.5+(ymax-ymin)/1.73205080757, ymax]);
	tri.push([0, 1, 2]);

	// すべての入力点が追加されるまで実行
	for(var step=0; step<pos.length; ++step) {

		// 新しい入力点を追加
		p = pos[step];
		dPos.push(p);

		// 入力点を外接円に内包する三角形を探す
		// その三角形は削除対象として格納される
		// このリストは値が降順になるように格納
		// 注意：総当たりで調べている。非効率！
		var removeTri=[];
		for(var i=0; i<tri.length; i++) {
			var c=new Circumcircle(
							dPos[tri[i][0]],
							dPos[tri[i][1]],
							dPos[tri[i][2]]
						);
			var distVec=numeric.sub(c.p, p);
			var dist=numeric.norm2(distVec);
			if(dist<c.rad) {
				removeTri.unshift(i);
			}
		}

		// removeTriに含まれる三角形を削除してできる
		// 多角形の頂点を抽出する
		var pointsDupricated = [];
		for(var i=0; i<removeTri.length; i++) {
			for(var j=0; j<3; j++) {
				pointsDupricated.push(tri[removeTri[i]][j]);
			}
		}
		var points = pointsDupricated.filter(function (x, i, self) {
			return self.indexOf(x)===i;
		});

		// removeTriリストの三角形をtriから削除する
		for(var i=0; i<removeTri.length; ++i) {
			tri.splice(removeTri[i], 1);
		}

		// 多角形の頂点を反時計回りに並べ替え
		points.sort(
			function (val1, val2) {
				th1=Math.atan2(dPos[val1][1]-p[1], dPos[val1][0]-p[0]);
				th2=Math.atan2(dPos[val2][1]-p[1], dPos[val2][0]-p[0]);
				return th2-th1;
			}
		);

		// 入力点と多角形の辺で構成される三角形を追加
		for(var i=0; i<points.length; i++) {
			var newTri=[points[i], points[(i+1)%points.length], dPos.length-1];
			tri.push(newTri);
		}
	}

	// superTriangleの頂点(0,1,2番)を含む三角形を探して削除
	removeTri = [];
	for(var i=0; i<tri.length; ++i) {
		for(var j=0; j<3; ++j) {
			if(tri[i][j]==0||tri[i][j]==1||tri[i][j]==2) {
				removeTri.unshift(i);
				break;
			}
		}
	}
	for(var i=0; i<removeTri.length; ++i) {
		tri.splice(removeTri[i],1);
	}

	// superTriangleの頂点を削除してtriに格納されているインデックスを-3する
	// dPos.splice(0, 3); とすると dPos == inputPoints となる
	for(var i=0; i<tri.length; ++i) {
		for(var j=0; j<3; ++j) {
			tri[i][j]-=3;
		}
	}

	return tri;
}


// 外接円クラス
function Circumcircle(p1, p2, p3) {
	this.p1=numeric.clone(p1);
	this.p2=numeric.clone(p2);
	this.p3=numeric.clone(p3);
	this.a=this.len(this.p2, this.p3);
	this.b=this.len(this.p3, this.p1);
	this.c=this.len(this.p1, this.p2);
	this.s=(this.a+this.b+this.c)*0.5;
	this.S=this.calcTriArea();
	this.rad=this.calcRad();
	this.p=this.calcCenter();
}

Circumcircle.prototype.len=function (p1, p2) {
	var r=numeric.sub(p1, p2);
	var len=numeric.norm2(r);
	return len;
}

Circumcircle.prototype.calcTriArea=function () {
	var area=Math.sqrt(this.s*(this.s-this.a)*(this.s-this.b)*(this.s-this.c));
	return area;
}

Circumcircle.prototype.calcRad=function () {
	return (this.a*this.b*this.c)/(4.0*this.S);
}

Circumcircle.prototype.calcCenter=function () {
	var tmp1=this.a*this.a*(this.b*this.b+this.c*this.c-this.a*this.a);
	var tmpv1=numeric.mul(tmp1, this.p1);

	var tmp2=this.b*this.b*(this.c*this.c+this.a*this.a-this.b*this.b);
	var tmpv2=numeric.mul(tmp2, this.p2);

	var tmp3=this.c*this.c*(this.a*this.a+this.b*this.b-this.c*this.c);
	var tmpv3=numeric.mul(tmp3, this.p3);

	var p;
	p=numeric.add(tmpv1, tmpv2);
	p=numeric.add(p, tmpv3);
	p=numeric.div(p, 16*this.S*this.S);
	return p;
}
