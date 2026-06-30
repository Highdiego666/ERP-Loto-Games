        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 14px;
            font-weight: bold;
            padding: 15px;
            width: 80mm;
            margin: 0 auto;
            background: #fff;
            line-height: 1.4;
        }
        .ticket { text-align: center; }
        .ticket h2 {
            font-size: 18px;
            margin-bottom: 2px;
            font-weight: bold;
            letter-spacing: 1px;
        }
        .ticket .sub {
            font-size: 12px;
            color: #555;
            margin-bottom: 10px;
            font-weight: normal;
        }
        .ticket hr {
            border: none;
            border-top: 1px dashed #ccc;
            margin: 8px 0;
        }
        .ticket .items {
            text-align: left;
            margin: 10px 0;
        }
        .ticket .items div {
            font-weight: bold;
            font-size: 14px;
            padding: 3px 0;
        }
        .ticket .total {
            font-size: 20px;
            font-weight: bold;
            margin: 10px 0;
        }
        .ticket .info-line {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            padding: 3px 0;
            font-weight: bold;
        }
        .ticket .info-line span:last-child {
            font-weight: bold;
        }
        .ticket .footer {
            font-size: 11px;
            color: #777;
            margin-top: 15px;
            border-top: 1px dashed #ccc;
            padding-top: 10px;
            font-weight: normal;
        }
        .ticket .no-devolucion {
            font-size: 14px;
            font-weight: bold;
            color: #d32f2f;
            margin: 6px 0;
        }
        .ticket .horario-garantia {
            font-size: 12px;
            color: #333;
            margin: 6px 0;
            font-weight: bold;
        }
        .ticket .terminos {
            text-align: left;
            font-size: 10px;
            line-height: 1.3;
            color: #333;
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px dashed #ccc;
            white-space: pre-wrap;
            font-family: 'Arial', sans-serif;
            font-weight: normal;
        }
        .ticket .terminos strong { font-weight: bold; }
        @media print {
            body { padding: 10px; }
            .no-print { display: none; }
        }
