// JavaScript Document
/// <reference path="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js" />
/// <reference path="numeric-1.2.6.min.js" />

var colors=['lightsalmon', 'lightseagreen', 'antiquewhite', 'aquamarine', 'beige', 'burlywood', 'mistyrose', 'mediumpurple', 'darkcyan', 'darkgray', 'orchid', 'peru', 'dodgerblue', 'aliceblue'];
var N=500;
var distMin=20;

$(document).ready(function () {
	initEvents($("#myCanvas"));
});

// キャンバスにイベントを紐付ける関数
function initEvents(canvas) {
	var canvasWidth=canvas.width();
	var canvasHeight=canvas.height();
	var clickPoint=[];

	var points=[];	// 頂点の座標群
	var tri=[];		// 頂点のコネクティビティ
	var head=[];	// DelaunayTriangleクラスのインスタンス配列
	init();

	var selectPoint=null;
	var clickState="up";
	draw();
	// mouseクリック時のイベントコールバック設定
	canvas.mousedown(function (event) {
		// 左クリック
		if(event.button==0) {
			var canvasOffset=canvas.offset();
			var canvasX=Math.floor(event.pageX-canvasOffset.left);
			var canvasY=Math.floor(event.pageY-canvasOffset.top);
			if(canvasX<0||canvasX>canvasWidth) {
				return;
			}
			if(canvasY<0||canvasY>canvasHeight) {
				return;
			}
			clickState="down";
			clickPoint = [canvasX, canvasY];
			draw();
		}
	});

	// mouse移動時のイベントコールバック設定
	canvas.mousemove(function (event) {
		var canvasOffset=canvas.offset();
		var canvasX=Math.floor(event.pageX-canvasOffset.left);
		var canvasY=Math.floor(event.pageY-canvasOffset.top);
		if(canvasX<0||canvasX>canvasWidth) {
			return;
		}
		if(canvasY<0||canvasY>canvasHeight) {
			return;
		}
		if(clickState=="down") {
			clickPoint=[canvasX, canvasY];
			draw();
		}
	});
	// mouseクリック解除時のイベントコールバック設定
	$(window).mouseup(function (event) {
		clickState="up";
	});

	$("input").click(function() {draw()});

	// リセットボタン
	$("#reset").click(function () {
		init();
		draw();
	})

	
	// 点群の生成と三角形分割
	function init() {
		// ランダムな点群を生成
		points = generateRondomPoints(canvasWidth, canvasHeight, distMin, N);
		// 三角形分割
		tri=new DelaunayTriangulation(points, canvasHeight, 0, canvasWidth, 0);
		// DelaunayTriangleオブジェクトの連結リストを作成
		head = makeDelaunayTriangleList(points, tri);
		// DelaunayTriangleオブジェクトの隣接関係を作成
		makeDataStructureForTriangles(head);
	}


	// レンダリングのリフレッシュを行う関数
	function draw() {

		// ローソンの三角形探査
		var result  = lawsonTriangleDetection(points, head, clickPoint);
		var triPath = result.trianglePath;
		var triAndEdge = result.triangleAndEdgePath;

		var context = canvas.get(0).getContext("2d");
		context.clearRect(0, 0, canvasWidth, canvasHeight);

		// 三角形の描画
		context.strokeStyle='black';
		if($('#colorCheckBox').is(':checked')) {
			fillTriangles(canvas, points, tri);
		}
		drawTriangles(canvas, points, tri);

		// 外接円の描画
		if($('#gaisetuenCheckBox').is(':checked')) {
			drawCircumcircles(canvas, points, tri);
		}
		context.fillStyle='black';

		// 点の描画
		drawPoints(canvas, points);

		// ローソンのアルゴリズムの過程で通った三角形の描画
		for(var i=0; i<triPath.length; ++i) {
			context.fillStyle='pink';
			drawTriangle(triPath[i].vertexID);
		}

		// 出発三角形の描画
		context.fillStyle='green';
		drawTriangle(head.vertexID);

		// 通った辺の描画
		var edgeTri;
		var edgeEdge;
		context.strokeStyle="orange";
		context.lineWidth=2;
		for(var i=0; i<triAndEdge.length; ++i) {
			edgeTri=triAndEdge[i].triangle;
			edgeEdge=triAndEdge[i].edge;
			context.beginPath();
			context.moveTo(points[edgeTri.vertexID[edgeEdge]][0], points[edgeTri.vertexID[edgeEdge]][1]);
			context.lineTo(points[edgeTri.vertexID[(edgeEdge+1)%3]][0], points[edgeTri.vertexID[(edgeEdge+1)%3]][1]);
			context.stroke();
		}
		context.lineWidth=1;

		// クリックした点の描画
		context.fillStyle='red';
		context.beginPath();
		context.arc(clickPoint[0], clickPoint[1], 5, 0, Math.PI*2, true);
		context.fill();

		function drawTriangle(vertexID) {
			context.beginPath();
			context.moveTo(points[vertexID[0]][0], points[vertexID[0]][1]);
			context.lineTo(points[vertexID[1]][0], points[vertexID[1]][1]);
			context.lineTo(points[vertexID[2]][0], points[vertexID[2]][1]);
			context.lineTo(points[vertexID[0]][0], points[vertexID[0]][1]);
			context.fill();
			context.stroke();
		}

	}
}


		
function lawsonTriangleDetection(points, head, newPoint) {
	// triID=0 から順にローソンのアルゴリズムを適用していく
	var triTmp = head;
	var triAndEdge = [];
	var edge = 0;
	var triPath = [];
	var vEdge, vPt;
	var isPointInner = false;
	var edgeTmp;
	while(1) {
		isPointInner = true;
		for(var i = 0; i < 3; ++i) {
			triAndEdge.push({ triangle: triTmp, edge: edge });
			vPt = numeric.sub(newPoint, points[triTmp.vertexID[edge]]);
			vEdge = numeric.sub(points[triTmp.vertexID[(edge + 1) % 3]], points[triTmp.vertexID[edge]]);
			// newPointが辺ベクトルの右側にあれば右隣りの三角形に移る
			if(vPt[0] * vEdge[1] - vPt[1] * vEdge[0] > 0) {
				triPath.push(triTmp);
				edgeTmp = triTmp.edgeIDinAdjacent[edge];
				triTmp = triTmp.adjacent[edge];
				edge = (edgeTmp + 1) % 3
				isPointInner = false;
				if(triTmp == null) {
					isPointInner = true;
					alert("Triangle search failed.");
				}
				break;
			}
			edge = (edge + 1) % 3;
		}
		if(isPointInner) {
			triPath.push(triTmp);
			break;
		}
	}
	return {trianglePath:triPath, triangleAndEdgePath:triAndEdge};
}

// DelaunayTriangleの連結リストを生成する
// 連結リストの先頭を返す
function makeDelaunayTriangleList(points, tri) {
	var head=new DelaunayTriangle([points[tri[0][0]], points[tri[0][1]], points[tri[0][2]]], tri[0]);
	var dTriTmp=head;
	for(var i=1; i<tri.length; ++i) {
		dTriTmp.push(new DelaunayTriangle([points[tri[i][0]], points[tri[i][1]], points[tri[i][2]]], tri[i]));
		dTriTmp=dTriTmp.next;
	}
	return head;
}


// ランダムな点群を生成する
function generateRondomPoints(width, height, distMin, N){
	var randx, randy;
	var dist, isTooClose;
	var points=[];
	for(var i=0; i<N; ++i) {
		for(var j=0; j<10; ++j) {
			randx=0.8*width*(Math.random()-0.5)+0.5*width;
			randy=0.8*height*(Math.random()-0.5)+0.5*height;
			isTooClose=false;
			for(var j=0; j<points.length; ++j) {
				dist=(randx-points[j][0])*(randx-points[j][0])+(randy-points[j][1])*(randy-points[j][1]);
				if(dist<distMin*distMin) {
					isTooClose=true;
					break;
				}
			}
			if(!isTooClose) {
				points.push([randx, randy]);
				break;
			}
		}
	}
	return points;
}

// headを先頭とする連結リストとして格納された
// DelaunayTriangleオブジェクトのadjacent, edgeIDinAdjacentを作成する
function makeDataStructureForTriangles(head){
	// dTri.adjacentを探索する
	// すべての辺について総当たりで調べる
	var foundFlag;
	var focusTri=null;
	var compTri=null;
	for(focusTri=head; focusTri!=null; focusTri=focusTri.next) {
		for(var j=0; j<3; ++j) {
			// すでに隣接する辺が見つかっていれば飛ばす
			if(focusTri.adjacent[j]!=null) {
				continue;
			}
			// すべての辺と総当たりで照合する
			foundFlag=false;
			for(compTri=head; compTri!=null; compTri=compTri.next){
				for(var l=0; l<3; ++l) {
					if(
						focusTri.vertexID[j]==compTri.vertexID[(l+1)%3]
						&&
						focusTri.vertexID[(j+1)%3]==compTri.vertexID[l]
						) {
						focusTri.adjacent[j]=compTri;
						focusTri.edgeIDinAdjacent[j]=l;
						compTri.adjacent[l]=focusTri;
						compTri.edgeIDinAdjacent[l]=j;
						foundFlag=true;
						break;
					}
				}
				if(foundFlag) {
					break;
				}
			}
		}
	}

}


// 以下、描画関係

function drawPoints(canvas, points) {
	var context=canvas.get(0).getContext("2d");
	var canvasWidth=canvas.width();
	var canvasHeight=canvas.height();
	context.setTransform(1, 0, 0, 1, 0, 0);
	for(var i=0; i<points.length; ++i) {
		context.beginPath();
		context.arc(points[i][0], points[i][1], 3, 0, 2*Math.PI, true);
		context.fill();
	}
}

function drawTriangles(canvas, points, triangles) {
	var context=canvas.get(0).getContext("2d");
	var canvasWidth=canvas.width();
	var canvasHeight=canvas.height();
	context.setTransform(1, 0, 0, 1, 0, 0);
	var tri;
	for(var i=0; i<triangles.length; ++i) {
		tri=triangles[i];
		context.beginPath();
		context.moveTo(points[tri[0]][0], points[tri[0]][1]);
		context.lineTo(points[tri[1]][0], points[tri[1]][1]);
		context.lineTo(points[tri[2]][0], points[tri[2]][1]);
		context.lineTo(points[tri[0]][0], points[tri[0]][1]);
		context.stroke();
	}
}


function fillTriangles(canvas, points, triangles) {
	var context=canvas.get(0).getContext("2d");
	var canvasWidth=canvas.width();
	var canvasHeight=canvas.height();
	context.setTransform(1, 0, 0, 1, 0, 0);
	var tri;
	for(var i=0; i<triangles.length; ++i) {
		context.fillStyle=colors[i%colors.length];
		tri=triangles[i];
		context.beginPath();
		context.moveTo(points[tri[0]][0], points[tri[0]][1]);
		context.lineTo(points[tri[1]][0], points[tri[1]][1]);
		context.lineTo(points[tri[2]][0], points[tri[2]][1]);
		context.lineTo(points[tri[0]][0], points[tri[0]][1]);
		context.fill();
	}
}


// 三角形の外接円を描画
function drawCircumcircles(canvas, points, tri) {
	var context=canvas.get(0).getContext("2d");
	var cir;
	for(var i=0; i<tri.length; ++i) {
		context.strokeStyle=colors[i%colors.length];
		context.beginPath();
		cir=new Circumcircle(points[tri[i][0]], points[tri[i][1]], points[tri[i][2]]);
		context.arc(cir.p[0], cir.p[1], cir.rad, 0, Math.PI*2, true);
		context.stroke();
	}
}

