import 'dotenv/config';
import dns2 from 'dns2';
import log from './utils/logger';
import pkg from '../package.json' assert {type: "json"};
const { Packet, createServer, UDPClient } = dns2;

const getPrivateDomains = async () => {
    let privateDomains = [];
    let envPrivateDomains = process.env.PRIVATE_DOMAINS?.split( ',' );

    for ( let i = 0; i < envPrivateDomains?.length; i++ ) {
        let privateDomain = await envPrivateDomains[i]?.replaceAll( '.', '\\.' );
        privateDomains.push( privateDomain?.trim() );
    }

    return privateDomains?.length > 0 ? privateDomains?.join( '|' ) : null;
};

const privateDomainMatcher = new RegExp( await getPrivateDomains() );

const privateResolve = UDPClient({ dns: process.env.PRIVATE_NAMESERVER || '8.8.8.8', port: 53, socketType: 'udp4' });
const publicResolve = UDPClient({ dns: process.env.PUBLIC_NAMESERVER || '8.8.8.8', port: 53, socketType: 'udp4' });

const server = createServer({
    udp: true,
    handle: async ( request, send, rinfo ) => {
        try {
            const response = Packet.createResponseFromRequest( request );
            const [question] = request.questions;
            const { name, type, cls } = question;

            const domainMatched = name?.match ( privateDomainMatcher );

            // console.log( rinfo.address, request.header.id, domainMatched ? '+' : '-', request.questions[0] );
            log.info( `${ rinfo.address?.padEnd( 15, ' ' ) } ${ domainMatched ? '+' : '-' } ${ request.header.id?.toString()?.padStart( 5, ' ' ) } ${ typeValueToType( request.questions[0]?.type )?.padStart( 5, ' ' ) } ${ request.questions[0]?.name }` );

            let result;
            if ( domainMatched ) {
                result = await privateResolve( name, typeValueToType( type ), cls );
            } else {
                result = await publicResolve( name, typeValueToType( type ), cls );
            }
            
            response.answers = result.answers;

            send( response );
        } catch ( err ) {
            log.error( '%o', err );
        }
    }
});

server.on( 'request', ( request, response, rinfo ) => {
});

server.on( 'requestError', ( error ) => {
    log.warn( 'Client sent an invalid request. $o', error );
});

server.on( 'listening', () => {
    log.info( `${pkg?.name} is listening for DNS requests.` );
});

server.on( 'close', () => {
    log.info( `${pkg?.name} is shutting down.` );
});

server.on( 'error', ( err ) => {
    log.error( '%o', err );
});

server.listen({
    udp: { port: 53 }
});

const handleSignal = ( signal ) => {
    server.close();
};

process.on( 'SIGINT', handleSignal );


const typeValueToType = ( typeValue ) => {
    switch ( typeValue ) {
        case 0x01:
            return 'A';
            break;
        case 0x02:
            return 'NS';
            break;
        case 0x03:
            return 'MD';
            break;
        case 0x04:
            return 'MF';
            break;
        case 0x05:
            return 'CNAME';
            break;
        case 0x06:
            return 'SOA';
            break;
        case 0x07:
            return 'MB';
            break;
        case 0x08:
            return 'MG';
            break;
        case 0x09:
            return 'MR';
            break;
        case 0x0A:
            return 'NULL';
            break;
        case 0x0B:
            return 'WKS';
            break;
        case 0x0C:
            return 'PTR';
            break;
        case 0x0D:
            return 'HINFO';
            break;
        case 0x0E:
            return 'MINFO';
            break;
        case 0x0F:
            return 'MX';
            break;
        case 0x10:
            return 'TXT';
            break;
        case 0x1C:
            return 'AAAA';
            break;
        case 0x21:
            return 'SRV';
            break;
        case 0x29:
            return 'EDNS';
            break;
        case 0x63:
            return 'SPF';
            break;
        case 0xFC:
            return 'AXFR';
            break;
        case 0xFD:
            return 'MAILB';
            break;
        case 0xFE:
            return 'MAILA';
            break;
        case 0xFF:
            return 'ANY';
            break;
        case 0x101:
            return 'CAA';
            break;
        default:
            return 'A';
            break;
    }
};

const classValueToClass = ( classValue ) => {
    switch ( classValue ) {
        case 0x01:
            return 'IN';
            break;
        case 0x02:
            return 'CS';
            break;
        case 0x03:
            return 'CH';
            break;
        case 0x04:
            return 'HS';
            break;
        case 0xFF:
            return 'ANY';
            break;
        default:
            return 'IN';
            break;
    }
}